import {
  AetherLinkProfileUpdate,
  DbSchema,
  Job,
  Profile,
} from "@aetherlink/core"
import {
  AuthError,
  FunctionsHttpError,
  PostgrestError,
  SupabaseClient,
  User,
} from "@supabase/supabase-js"
import { backOff } from "exponential-backoff"

const PASSWORD_RESET_REDIRECT =
  process.env.NEXT_PUBLIC_WEBAPP_URL?.replace(/\/$/, "") ||
  "http://localhost:3002"

/**
 * Supabase client API for AetherLink.
 */
export class AetherLinkSupabaseApi {
  constructor(private _supabase: SupabaseClient<DbSchema>) {}

  async signupWithEmail({
    email,
    password,
  }: {
    email: string
    password: string
  }) {
    const { error, data } = await this._supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async loginWithEmail({
    email,
    password,
  }: {
    email: string
    password: string
  }) {
    return this._supabaseApiCall(() =>
      // @ts-expect-error wrong typings, but works
      this._supabase.auth.signInWithPassword({ email, password })
    )
  }

  sendPasswordResetEmail({ email }: { email: string }) {
    return this._supabaseApiCall(() =>
      this._supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${PASSWORD_RESET_REDIRECT}/auth/callback`,
      })
    )
  }

  updatePassword({ password }: { password: string }) {
    return this._supabaseApiCall(() =>
      // @ts-expect-error wrong typings, but works
      this._supabase.auth.updateUser({ password })
    )
  }

  async logout() {
    const { error } = await this._supabase.auth.signOut()
    if (error) throw error
  }

  getUser(): Promise<{ user: User | null }> {
    return this._supabaseApiCall(
      // @ts-expect-error wrong typings, but works
      async () => await this._supabase.auth.getUser()
    ).catch(() => ({
      user: null as User | null,
    }))
  }

  async getProfile() {
    try {
      const { data: { user } } = await this._supabase.auth.getUser()
      if (!user) return undefined

      const { data, error } = await this._supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (error) throw error
      return data as Profile | undefined
    } catch {
      return undefined
    }
  }

  async getAetherLinkProfile(): Promise<Profile | undefined> {
    return this.getProfile()
  }

  async updateAetherLinkProfile(
    fields: AetherLinkProfileUpdate
  ): Promise<Profile> {
    const [updated] = await this._supabaseApiCall(async () =>
      this._supabase.from("profiles").update(fields).select("*")
    )
    return updated as Profile
  }

  async listFeedJobs({
    limit = 50,
    after,
    search,
  }: {
    limit?: number
    after?: string
    search?: string
  }) {
    const jobs = await this._supabaseApiCall<Job[], PostgrestError>(async () =>
      this._supabase.rpc("list_feed_jobs", {
        jobs_after: after ?? null,
        jobs_page_size: limit,
        jobs_search: search || null,
      })
    )

    let nextPageToken: string | undefined
    if (jobs.length === limit) {
      const lastJob = jobs[jobs.length - 1]
      nextPageToken = `${lastJob.id}!${lastJob.updated_at}`
    }

    return { jobs, nextPageToken }
  }

  async getFeedJob(jobId: number) {
    const rows = await this._supabaseApiCall<
      Array<Job & { employer_verified?: boolean }>,
      PostgrestError
    >(async () => this._supabase.rpc("get_feed_job", { p_job_id: jobId }))

    return rows[0] ?? null
  }

  async listApplications() {
    return this._supabaseApiCall(async () =>
      this._supabase
        .from("applications")
        .select("*, jobs(id, title, companyName, hr_email)")
        .order("created_at", { ascending: false })
    )
  }

  async recordApplicationOutcome({
    applicationId,
    outcome,
  }: {
    applicationId: string
    outcome: string
  }) {
    return this._supabaseApiCall(async () =>
      this._supabase
        .from("applications")
        .update({
          outcome,
          outcome_recorded_at: new Date().toISOString(),
        })
        .eq("id", applicationId)
    )
  }

  private async _supabaseApiCall<
    T,
    E extends Error | PostgrestError | FunctionsHttpError | AuthError,
  >(
    method: () => Promise<
      { data: T | null; error: null } | { data: null; error: E }
    >
  ) {
    const { data, error } = await backOff(
      async () => {
        const result = await method()
        return result
      },
      {
        numOfAttempts: 5,
        jitter: "full",
        startingDelay: 300,
      }
    )

    if (error) throw error

    if (
      !!data &&
      typeof data === "object" &&
      "errorMessage" in data &&
      typeof data.errorMessage === "string"
    ) {
      throw new Error(data.errorMessage)
    }

    return data as T
  }
}
