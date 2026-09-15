export type CandidateStatus = "active" | "passive" | "placed" | "archived";
export type CandidateSource =
  | "site"
  | "import_disk"
  | "import_csv"
  | "email"
  | "manual"
  | "referral";

export type Candidate = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  preferred_regions: string[] | null;
  spoken_languages: string[];
  programming_languages: string[];
  technologies: string[];
  role_types: string[];
  experience_years: string | null;
  seniority: string | null;
  job_scope: string[];
  institution: string | null;
  cohort_year: number | null;
  notes_from_candidate: string | null;
  notes_internal: string | null;
  contact_before_sending: boolean;
  /** Graduate of the DiversiTech practicum. */
  diversitech_practicum: boolean;
  status: CandidateStatus;
  source: CandidateSource;
  tags: string[];
  consent_marketing: boolean;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
  /** Everything about her as one lowercase string — fields plus the current CV's text. */
  search_text?: string | null;
};

export type CvDocument = {
  id: string;
  candidate_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  version: number;
  is_current: boolean;
  parse_status: "pending" | "processing" | "parsed" | "needs_review" | "failed";
  created_at: string;
};

export type JobPosting = {
  id: string;
  title: string;
  public_slug: string | null;
  public_description: string | null;
  required_technologies: string[];
  seniority: string | null;
  region: string | null;
  job_scope: string[];
  created_at: string;
};

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_emoji: string | null;
  published_at: string | null;
};

/** A scored candidate returned by the requirement-matching engine. */
export type MatchResult = {
  candidate: Candidate;
  score: number;
  /** Human-readable one-liner explaining why she matched. */
  reason: string;
  matchedTechnologies: string[];
  missingTechnologies: string[];
};
