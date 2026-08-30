-- ============================================================================
-- Chana Bergman — core schema
--
-- Design notes:
--  * `candidates` is the identity record. A woman who arrives three times
--    (disk import, Smoove list, site upload) must stay ONE candidate — see the
--    dedup keys and `find_candidate_match()` below.
--  * `cv_documents` is versioned. Uploading a newer CV never overwrites the
--    old file; it adds a version and flips `is_current`.
--  * Original files are never hard-deleted (`deleted_at` soft delete only).
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type candidate_status as enum ('active', 'passive', 'placed', 'archived');
create type candidate_source as enum ('site', 'import_disk', 'import_csv', 'email', 'manual', 'referral');
create type cv_parse_status as enum ('pending', 'processing', 'parsed', 'needs_review', 'failed');
create type requirement_status as enum ('open', 'in_progress', 'closed', 'cancelled');
create type campaign_status as enum ('draft', 'sending', 'sent', 'failed');
create type recipient_status as enum ('queued', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed', 'failed');

-- ---------------------------------------------------------------------------
-- app_users — mirrors auth.users, adds the admin flag
-- ---------------------------------------------------------------------------
create table app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from app_users where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- candidates
-- ---------------------------------------------------------------------------
create table candidates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references auth.users (id) on delete set null,

  first_name text,
  last_name text,
  email text,
  phone text,
  -- Normalised duplicate-detection keys, maintained by trigger.
  email_key text generated always as (nullif(lower(trim(email)), '')) stored,
  phone_key text,

  city text,
  preferred_region text,
  spoken_languages text[] not null default '{}',
  programming_languages text[] not null default '{}',
  technologies text[] not null default '{}',
  role_types text[] not null default '{}',
  experience_years text,
  seniority text,
  job_scope text[] not null default '{}',

  institution text,
  cohort_year int,

  notes_from_candidate text,
  notes_internal text,
  contact_before_sending boolean not null default false,

  status candidate_status not null default 'active',
  source candidate_source not null default 'site',
  tags text[] not null default '{}',

  consent_marketing boolean not null default false,
  consent_at timestamptz,
  unsubscribed_at timestamptz,

  search_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Partial unique indexes: one candidate per email / per phone, ignoring blanks
-- and soft-deleted rows. These are what actually enforce dedup at the DB level.
create unique index candidates_email_key_uniq on candidates (email_key) where email_key is not null and deleted_at is null;
create unique index candidates_phone_key_uniq on candidates (phone_key) where phone_key is not null and deleted_at is null;

create index candidates_status_idx on candidates (status) where deleted_at is null;
create index candidates_cohort_idx on candidates (institution, cohort_year);
create index candidates_tech_idx on candidates using gin (technologies);
create index candidates_langs_idx on candidates using gin (programming_languages);
create index candidates_roles_idx on candidates using gin (role_types);
create index candidates_tags_idx on candidates using gin (tags);
create index candidates_search_idx on candidates using gin (search_text gin_trgm_ops);
create index candidates_fts_idx on candidates using gin (to_tsvector('simple', coalesce(search_text, '')));

-- ---------------------------------------------------------------------------
-- cv_documents — versioned, originals preserved
-- ---------------------------------------------------------------------------
create table cv_documents (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references candidates (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  version int not null default 1,
  is_current boolean not null default true,
  source candidate_source not null default 'site',
  extracted_text text,
  parse_status cv_parse_status not null default 'pending',
  parse_error text,
  parsed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index cv_documents_one_current on cv_documents (candidate_id) where is_current;
create index cv_documents_candidate_idx on cv_documents (candidate_id, version desc);
create index cv_documents_parse_idx on cv_documents (parse_status) where parse_status in ('pending', 'needs_review');

-- ---------------------------------------------------------------------------
-- segments — "פרקטיקום 2024", "בוגרות וולף", "מנוסות פלוס"
-- ---------------------------------------------------------------------------
create table segments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  -- When set, the segment is dynamic: filters are applied at query time.
  filter_json jsonb,
  created_at timestamptz not null default now()
);

create table candidate_segments (
  candidate_id uuid not null references candidates (id) on delete cascade,
  segment_id uuid not null references segments (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (candidate_id, segment_id)
);

-- ---------------------------------------------------------------------------
-- employers, requirements, shortlists
-- ---------------------------------------------------------------------------
create table employers (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table requirements (
  id uuid primary key default uuid_generate_v4(),
  employer_id uuid references employers (id) on delete set null,
  title text not null,
  raw_text text,
  required_technologies text[] not null default '{}',
  required_languages text[] not null default '{}',
  seniority text,
  region text,
  job_scope text[] not null default '{}',
  status requirement_status not null default 'open',
  -- Published to the public job board?
  is_public boolean not null default false,
  public_slug text unique,
  public_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index requirements_public_idx on requirements (is_public, status) where is_public;

create table requirement_matches (
  requirement_id uuid not null references requirements (id) on delete cascade,
  candidate_id uuid not null references candidates (id) on delete cascade,
  score numeric,
  reason text,
  shortlisted boolean not null default false,
  sent_to_employer_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (requirement_id, candidate_id)
);

-- ---------------------------------------------------------------------------
-- campaigns — bulk email
-- ---------------------------------------------------------------------------
create table campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subject text not null,
  body_html text not null,
  requirement_id uuid references requirements (id) on delete set null,
  status campaign_status not null default 'draft',
  provider text,
  provider_message_id text,
  sent_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table campaign_recipients (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  candidate_id uuid not null references candidates (id) on delete cascade,
  email text not null,
  status recipient_status not null default 'queued',
  error text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  unique (campaign_id, candidate_id)
);

create index campaign_recipients_campaign_idx on campaign_recipients (campaign_id, status);

-- ---------------------------------------------------------------------------
-- activity log + inbound employer leads + blog
-- ---------------------------------------------------------------------------
create table activity_log (
  id bigserial primary key,
  candidate_id uuid references candidates (id) on delete cascade,
  requirement_id uuid references requirements (id) on delete set null,
  actor uuid references auth.users (id) on delete set null,
  kind text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_candidate_idx on activity_log (candidate_id, created_at desc);

create table employer_leads (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text,
  email text not null,
  phone text,
  roles_wanted text,
  attachment_path text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table posts (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body_md text not null,
  cover_emoji text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index posts_published_idx on posts (published, published_at desc);

-- ---------------------------------------------------------------------------
-- Triggers: phone normalisation, search_text, updated_at
-- ---------------------------------------------------------------------------
create or replace function normalize_il_phone(p text)
returns text
language plpgsql
immutable
as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '\D', '', 'g');
  if d like '972%' then d := '0' || substring(d from 4); end if;
  if length(d) = 9 and d not like '0%' then d := '0' || d; end if;
  if length(d) < 9 then return null; end if;
  return d;
end;
$$;

create or replace function candidates_before_write()
returns trigger
language plpgsql
as $$
begin
  new.phone_key := normalize_il_phone(new.phone);
  new.search_text := lower(concat_ws(' ',
    new.first_name, new.last_name, new.email, new.phone, new.city,
    new.preferred_region, new.institution, new.cohort_year::text,
    array_to_string(new.programming_languages, ' '),
    array_to_string(new.technologies, ' '),
    array_to_string(new.role_types, ' '),
    array_to_string(new.spoken_languages, ' '),
    array_to_string(new.tags, ' '),
    new.seniority, new.experience_years,
    new.notes_from_candidate, new.notes_internal
  ));
  new.updated_at := now();
  return new;
end;
$$;

create trigger candidates_before_write_trg
  before insert or update on candidates
  for each row execute function candidates_before_write();

-- Appending the parsed CV text into the candidate's search blob keeps
-- free-text search running over CV contents, not just structured fields.
create or replace function cv_after_parse()
returns trigger
language plpgsql
as $$
begin
  if new.extracted_text is not null and new.is_current then
    update candidates
       set search_text = coalesce(search_text, '') || ' ' || lower(new.extracted_text)
     where id = new.candidate_id;
  end if;
  return new;
end;
$$;

create trigger cv_after_parse_trg
  after insert or update of extracted_text on cv_documents
  for each row execute function cv_after_parse();

-- ---------------------------------------------------------------------------
-- Dedup helper: returns the existing candidate id for an incoming record.
-- Email wins, then phone. Name+institution+cohort is deliberately NOT
-- auto-merged — it goes to the manual review queue instead.
-- ---------------------------------------------------------------------------
create or replace function find_candidate_match(p_email text, p_phone text)
returns uuid
language sql
stable
as $$
  select id from candidates
   where deleted_at is null
     and email_key is not null
     and email_key = nullif(lower(trim(p_email)), '')
   limit 1
  union all
  select id from candidates
   where deleted_at is null
     and phone_key is not null
     and phone_key = normalize_il_phone(p_phone)
   limit 1
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table app_users enable row level security;
alter table candidates enable row level security;
alter table cv_documents enable row level security;
alter table segments enable row level security;
alter table candidate_segments enable row level security;
alter table employers enable row level security;
alter table requirements enable row level security;
alter table requirement_matches enable row level security;
alter table campaigns enable row level security;
alter table campaign_recipients enable row level security;
alter table activity_log enable row level security;
alter table employer_leads enable row level security;
alter table posts enable row level security;

-- app_users: you can read yourself; admin reads all.
create policy app_users_self_read on app_users for select using (id = auth.uid() or is_admin());

-- candidates: a signed-in candidate sees and edits only her own row.
create policy candidates_admin_all on candidates for all using (is_admin()) with check (is_admin());
create policy candidates_self_read on candidates for select using (user_id = auth.uid());
create policy candidates_self_update on candidates for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- cv_documents: same shape.
create policy cv_admin_all on cv_documents for all using (is_admin()) with check (is_admin());
create policy cv_self_read on cv_documents for select using (
  exists (select 1 from candidates c where c.id = candidate_id and c.user_id = auth.uid())
);

-- Admin-only tables.
create policy segments_admin on segments for all using (is_admin()) with check (is_admin());
create policy candidate_segments_admin on candidate_segments for all using (is_admin()) with check (is_admin());
create policy employers_admin on employers for all using (is_admin()) with check (is_admin());
create policy requirement_matches_admin on requirement_matches for all using (is_admin()) with check (is_admin());
create policy campaigns_admin on campaigns for all using (is_admin()) with check (is_admin());
create policy campaign_recipients_admin on campaign_recipients for all using (is_admin()) with check (is_admin());
create policy activity_log_admin on activity_log for all using (is_admin()) with check (is_admin());
create policy employer_leads_admin on employer_leads for all using (is_admin()) with check (is_admin());

-- requirements: public job board rows are world-readable; the rest admin-only.
create policy requirements_public_read on requirements for select using (is_public and status = 'open');
create policy requirements_admin on requirements for all using (is_admin()) with check (is_admin());

-- posts: published rows are world-readable.
create policy posts_public_read on posts for select using (published);
create policy posts_admin on posts for all using (is_admin()) with check (is_admin());

-- NOTE: anonymous CV submission and the employer contact form are NOT exposed
-- as public INSERT policies. They go through server routes using the service
-- role, so we can run dedup, validation and rate limiting before writing.

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false), ('requirements', 'requirements', false)
on conflict (id) do nothing;

create policy "cv files admin read" on storage.objects
  for select using (bucket_id = 'cvs' and is_admin());

create policy "requirement files admin read" on storage.objects
  for select using (bucket_id = 'requirements' and is_admin());
