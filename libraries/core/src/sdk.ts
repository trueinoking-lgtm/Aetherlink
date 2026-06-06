import type { User } from '@supabase/supabase-js';

import type { AetherLinkProfileUpdate, Job, Profile } from './types';

/**
 * AetherLink API SDK — auth, profile, shared feed, applications.
 */
export interface AetherLinkApiSdk {
  getUser(): Promise<{ user: User | null }>;

  loginWithEmail(_: { email: string; password: string }): Promise<unknown>;

  logout(): Promise<void>;

  signupWithEmail(_: { email: string; password: string }): Promise<unknown>;

  sendPasswordResetEmail(_: { email: string }): Promise<unknown>;

  updatePassword(_: { password: string }): Promise<unknown>;

  getProfile(): Promise<Profile | undefined>;

  getAetherLinkProfile(): Promise<Profile | undefined>;

  updateAetherLinkProfile(fields: AetherLinkProfileUpdate): Promise<Profile>;

  listFeedJobs(_: {
    limit?: number;
    after?: string;
    search?: string;
  }): Promise<{ jobs: Job[]; nextPageToken?: string }>;

  getFeedJob(jobId: number): Promise<(Job & { employer_verified?: boolean }) | null>;

  listApplications(): Promise<unknown[]>;

  recordApplicationOutcome(_: {
    applicationId: string;
    outcome: string;
  }): Promise<unknown>;
}
