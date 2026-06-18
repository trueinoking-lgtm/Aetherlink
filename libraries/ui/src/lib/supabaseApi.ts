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
 * Check if we're in debug bypass mode (set by ?debug=true query param).
 */
function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.search.includes('debug=true');
}

/**
 * Return a mock user for debug mode.
 */
function getDebugUser(): User {
  return { id: 'debug-user', email: 'debug@aetherlink.dev' } as User;
}

/**
 * Return a mock profile for debug mode.
 */
function getDebugProfile(): Profile {
  return {
    id: 1,
    user_id: 'debug-user',
    full_name: 'Debug User',
    location: 'Harare',
    preferred_job_types: ['Tech'],
    salary_floor: 0,
    auto_apply_enabled: false,
    auto_apply_threshold: 80,
    skills: ['JavaScript', 'TypeScript', 'React'],
    headline: 'Full Stack Developer',
    subscription_end_date: new Date().toISOString(),
    subscription_tier: 'basic' as const,
    is_trial: false,
  } as Profile;
}

/**
 * Return mock jobs for debug mode.
 */
function getDebugJobs(): Job[] {
  return [
    {
      id: 1,
      user_id: 'debug-user',
      externalId: 'test-1',
      externalUrl: 'https://example.com/job/1',
      siteId: 1,
      title: 'Senior Full Stack Engineer',
      companyName: 'TechCorp',
      jobType: 'remote',
      location: 'Harare, Zimbabwe',
      salary: '$3,000 - $5,000',
      tags: ['React', 'Node.js', 'TypeScript'],
      description: 'Build amazing things.',
      status: 'new',
      labels: [],
      created_at: new Date('2026-06-15'),
      updated_at: new Date('2026-06-15'),
      raw_text: 'Full stack engineer with React and Node.js experience. TypeScript preferred.',
    },
    {
      id: 2,
      user_id: 'debug-user',
      externalId: 'test-2',
      externalUrl: 'https://example.com/job/2',
      siteId: 1,
      title: 'Frontend Developer',
      companyName: 'DesignStudio',
      jobType: 'hybrid',
      location: 'Harare',
      salary: '$1,500 - $2,500',
      tags: ['Vue', 'CSS', 'JavaScript'],
      description: 'UI focused role.',
      status: 'new',
      labels: [],
      created_at: new Date('2026-06-16'),
      updated_at: new Date('2026-06-16'),
      raw_text: 'Frontend developer with Vue.js and CSS skills needed.',
    },
    {
      id: 3,
      user_id: 'debug-user',
      externalId: 'test-3',
      externalUrl: 'https://example.com/job/3',
      siteId: 1,
      title: 'DevOps Engineer',
      companyName: 'CloudSystems',
      jobType: 'onsite',
      location: 'Harare',
      salary: '$2,000 - $4,000',
      tags: ['AWS', 'Docker', 'Kubernetes'],
      description: 'Infrastructure role.',
      status: 'new',
      labels: [],
      created_at: new Date('2026-06-17'),
      updated_at: new Date('2026-06-17'),
      raw_text: 'DevOps engineer with AWS, Docker, and Kubernetes experience.',
    },
  ] as Job[];
}

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

  /** Override: return mock user in debug mode */
  async getUser(): Promise<{ user: User | null }> {
    if (isDebugMode()) {
      return { user: getDebugUser() };
    }
    return this._supabaseApiCall(
      // @ts-expect-error wrong typings, but works
      async () => await this._supabase.auth.getUser()
    ).catch(() => ({
      user: null as User | null,
    }))
  }

  async getProfile() {
    if (isDebugMode()) {
      return getDebugProfile();
    }
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
    if (isDebugMode()) {
      // Return mock profile in debug mode
      return { ...getDebugProfile(), ...fields } as Profile;
    }

    const { data: { user } } = await this._supabase.auth.getUser()
    if (!user) throw new Error('Authentication required to update profile')

    const rpcResult = await this._supabase.rpc("update_aetherlink_profile", { p_fields: fields })
    const { data, error } = rpcResult as unknown as { data: Profile | null; error: PostgrestError | null }

    if (error) throw error
    if (!data) throw new Error('Unable to update profile')

    return data
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
    if (isDebugMode()) {
      return { jobs: getDebugJobs().slice(0, limit), nextPageToken: undefined };
    }
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
    if (isDebugMode()) {
      const job = getDebugJobs().find(j => j.id === jobId);
      return job ?? null;
    }
    const rows = await this._supabaseApiCall<
      Array<Job & { employer_verified?: boolean }>,
      PostgrestError
    >(async () => this._supabase.rpc("get_feed_job", { p_job_id: jobId }))

    return rows[0] ?? null
  }

  async listApplications() {
    if (isDebugMode()) {
      return [];
    }
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