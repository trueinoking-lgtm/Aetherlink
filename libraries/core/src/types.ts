export enum SiteProvider {
  linkedin = 'linkedin',
  glassdoor = 'glassdoor',
  indeed = 'indeed',
  remoteok = 'remoteok',
  weworkremotely = 'weworkremotely',
  dice = 'dice',
  flexjobs = 'flexjobs',
  bestjobs = 'bestjobs',
  echojobs = 'echojobs',
  remotive = 'remotive',
  remoteio = 'remoteio',
  builtin = 'builtin',
  naukri = 'naukri',
  robertHalf = 'robertHalf',
  zipRecruiter = 'zipRecruiter',
  usaJobs = 'usaJobs',
  talent = 'talent',
  hiringCafe = 'hiringCafe',

  // generic provider for sites not in the list above
  custom = 'custom',
}

export const JOB_LABELS = {
  CONSIDERING: 'Considering',
  SUBMITTED: 'Submitted',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  GHOSTED: 'Ghosted',
} as const;

export type JobLabel = (typeof JOB_LABELS)[keyof typeof JOB_LABELS];

export type User = {
  id: string;
  email: string;
};

export type JobSite = {
  id: number;
  provider: SiteProvider;
  name: string;
  urls: string[];
  queryParamsToRemove?: string[];
  blacklisted_paths: string[];
  created_at: string;
  logo_url: string;
  deprecated: boolean;
  incognito_support: boolean;
};

export type Link = {
  id: number;
  url: string;
  title: string;
  user_id: string;
  site_id: number;
  created_at: string;
  scrape_failure_count: number;
  last_scraped_at: string;
  scrape_failure_email_sent: boolean;
};

export type JobType = 'remote' | 'hybrid' | 'onsite';
export type JobStatus = 'new' | 'applied' | 'archived' | 'deleted' | 'processing' | 'excluded_by_advanced_matching';
export type Job = {
  id: number;
  user_id: string;
  externalId: string;
  externalUrl: string;
  siteId: number;

  // main info
  title: string;
  companyName: string;
  companyLogo?: string;

  // metadata
  jobType?: JobType;
  location?: string;
  salary?: string;
  tags: string[];

  description?: string;

  status: JobStatus;
  labels: JobLabel[];

  created_at: string | Date;
  updated_at: string | Date;

  link_id?: number;

  exclude_reason?: string;

  // Structured parsing fields (Jobs Zimbabwe format)
  summary?: string;
  responsibilities: string[];
  requirements: string[];
  how_to_apply?: string;
  application_email?: string;
  application_phone?: string;
  application_url?: string;
  employment_type?: string;
  category?: string;
  posted_at?: string;
  closing_date?: string;
  parser_status: string;
  parser_version: number;

  // Legacy AetherLink extensions
  hr_email?: string;
  source_group?: string;
  post_hash?: string;
  repost_count?: number;
  deadline?: string;
  opportunity_window_expires_at?: string;
  raw_text?: string;
  is_shared?: boolean;
  employer_verified?: boolean;
};

export type FeedJob = Job & {
  employer_verified?: boolean;
};

export type ApplicationOutcome = 'still_waiting' | 'interview' | 'offer' | 'no_response';

export type Application = {
  id: string;
  user_id: string;
  job_id: number;
  cover_letter?: string;
  cv_version?: Record<string, unknown>;
  status: string;
  outcome?: ApplicationOutcome | string;
  outcome_recorded_at?: string;
  response_days?: number;
  created_at: string;
};

/** @deprecated Use Profile — AetherLink columns are on Profile directly. */
export type AetherLinkProfile = Profile;

export type CvDraft = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  skills: string[];
  certifications: string[];
  experience: Array<{
    role: string;
    company: string;
    duration: string;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    qualification: string;
    year: string;
  }>;
};

export type Review = {
  id: number;
  user_id: string;
  title: string;
  description?: string;
  rating: number;
  created_at: Date;
};
export type HtmlDump = {
  id: number;
  user_id: string;
  url: string;
  html: string;
  created_at: Date;
  webpage_runtime_data?: WebPageRuntimeData;
};
export type Note = {
  id: number;
  created_at: Date;
  user_id: string;
  job_id: number;
  text: string;
  files: string[];
};

export type SubscriptionTier = 'basic' | 'pro';
export type Profile = {
  id: number;
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_end_date: string;
  subscription_tier: SubscriptionTier;
  is_trial: boolean;
  full_name?: string;
  headline?: string;
  location?: string;
  preferred_job_types?: string[];
  salary_floor?: number;
  auto_apply_enabled?: boolean;
  auto_apply_threshold?: number;
  skills?: string[];
  certifications?: string[];
  gmail_email?: string;
  gmail_refresh_token_encrypted?: string;
  consent_given_at?: string;
  daily_apply_count?: number;
  daily_apply_reset_at?: string;
};

/** Subset of Profile fields writable by AetherLink (onboarding, Gmail connect, consent). */
export type AetherLinkProfileUpdate = Partial<
  Pick<
    Profile,
    | 'full_name'
    | 'headline'
    | 'location'
    | 'preferred_job_types'
    | 'salary_floor'
    | 'auto_apply_enabled'
    | 'auto_apply_threshold'
    | 'skills'
    | 'certifications'
    | 'gmail_email'
    | 'gmail_refresh_token_encrypted'
    | 'consent_given_at'
    | 'daily_apply_count'
    | 'daily_apply_reset_at'
  >
>;

export type StripeBillingPlan = {
  tier: SubscriptionTier;
  monthlyCheckoutLink: string;
  quarterlyCheckoutLink: string;
  biannuallyCheckoutLink: string;
  yearlyCheckoutLink: string;
};

export type StripeConfig = {
  customerPortalLink: string;
  plans: StripeBillingPlan[];
};

export type AdvancedMatchingConfig = {
  id: number;
  user_id: string;
  blacklisted_companies: string[];
  chatgpt_prompt: string;
  ai_api_cost: number;
  ai_api_input_tokens_used: number;
  ai_api_output_tokens_used: number;
};

export type WebPageRuntimeData = Partial<Record<SiteProvider, ProviderRuntimeData>>;
export type LinkedinRuntimeData = {
  type: SiteProvider.linkedin;
  comoRehydration: string;
};

export type ProviderRuntimeData = LinkedinRuntimeData;

/**
 * Supabase database schema.
 */
export type DbSchema = {
  public: {
    Tables: {
      sites: {
        Row: JobSite;
        Insert: Pick<JobSite, 'name' | 'urls'>;
        Update: never;
        Relationships: [];
      };
      links: {
        Row: Link;
        Insert: Pick<Link, 'url' | 'title' | 'site_id'>;
        Update: {
          title?: string;
          url?: string;
          scrape_failure_count?: number;
          last_scraped_at?: Date;
          scrape_failure_email_sent?: boolean;
        };
        Relationships: [];
      };
      jobs: {
        Row: Job;
        Insert: Pick<
          Job,
          | 'siteId'
          | 'externalId'
          | 'externalUrl'
          | 'title'
          | 'companyName'
          | 'companyLogo'
          | 'location'
          | 'salary'
          | 'tags'
          | 'jobType'
          | 'status'
          | 'link_id'
        >;
        Update: Pick<Job, 'status'> | Pick<Job, 'description'> | Pick<Job, 'labels'>;
        Relationships: [];
      };
      reviews: {
        Row: Review;
        Insert: Pick<Review, 'title' | 'description' | 'rating'>;
        Update: Pick<Review, 'title' | 'description' | 'rating'>;
        Relationships: [];
      };
      html_dumps: {
        Row: HtmlDump;
        Insert: Pick<HtmlDump, 'url' | 'html' | 'webpage_runtime_data'>;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: never;
        Update: Partial<
          Pick<
            Profile,
            | 'stripe_customer_id'
            | 'stripe_subscription_id'
            | 'subscription_end_date'
            | 'subscription_tier'
            | 'is_trial'
            | 'full_name'
            | 'headline'
            | 'location'
            | 'preferred_job_types'
            | 'salary_floor'
            | 'auto_apply_enabled'
            | 'auto_apply_threshold'
            | 'skills'
            | 'certifications'
            | 'gmail_email'
            | 'gmail_refresh_token_encrypted'
            | 'consent_given_at'
            | 'daily_apply_count'
            | 'daily_apply_reset_at'
          >
        >;
        Relationships: [];
      };
      notes: {
        Row: Note;
        Insert: Pick<Note, 'job_id' | 'text' | 'files'>;
        Update: Partial<Pick<Note, 'text' | 'files'>>;
        Relationships: [];
      };
      advanced_matching: {
        Row: AdvancedMatchingConfig;
        Insert: Pick<AdvancedMatchingConfig, 'blacklisted_companies' | 'chatgpt_prompt'>;
        Update: Partial<Pick<AdvancedMatchingConfig, 'blacklisted_companies' | 'chatgpt_prompt'>>;
        Relationships: [];
      };
      applications: {
        Row: Application;
        Insert: Pick<Application, 'job_id' | 'cover_letter' | 'cv_version' | 'status'>;
        Update: Partial<Pick<Application, 'outcome' | 'outcome_recorded_at' | 'response_days'>>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      list_feed_jobs: {
        Params: {
          jobs_after: string | null;
          jobs_page_size: number;
          jobs_search?: string | null;
        };
        Args: {};
        Returns: Job[];
      };
      get_feed_job: {
        Params: { p_job_id: number };
        Args: {};
        Returns: FeedJob[];
      };
      increment_daily_apply_count: {
        Params: { p_user_id: string };
        Args: {};
        Returns: number;
      };
      update_aetherlink_profile: {
        Params: { p_fields: Record<string, unknown> };
        Args: {};
        Returns: Profile;
      };
      upsert_employer_signal: {
        Params: { p_email: string };
        Args: {};
        Returns: void;
      };
      list_jobs: {
        Params: {
          jobs_status: JobStatus;
          jobs_after: number | null;
          jobs_page_size: number;
          jobs_search?: string;
          jobs_site_ids?: number[];
          jobs_link_ids?: number[];
        };
        Args: {};
        Returns: Job[];
      };
      count_jobs: {
        Params: {
          jobs_status?: JobStatus;
          jobs_search?: string;
          jobs_site_ids?: number[];
          jobs_link_ids?: number[];
        };
        Args: {};
        Returns: Array<{
          status: JobStatus;
          job_count: number;
        }>;
      };
      get_user_id_by_email: {
        Params: { email: string };
        Args: {};
        Returns: { id: string };
      };
      count_chatgpt_usage: {
        Params: {
          for_user_id: string;
          cost_increment: number;
          input_tokens_increment: number;
          output_tokens_increment: number;
        };
        Args: {};
        Returns: {};
      };
    };
  };
};
