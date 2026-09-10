-- תיקונים מהבדיקה המלאה של המערכת (ספטמבר 2026).

-- ---------------------------------------------------------------------------
-- 1. Search and "last updated".
--
-- cv_after_parse appended the CV text to search_text, but this trigger rebuilt
-- search_text from the fields on the very next write and erased it: 0 of 22
-- CVs with text were findable. The previous version of this function also
-- dropped `updated_at := now()`, so no candidate ever looked recently updated.
-- ---------------------------------------------------------------------------
create or replace function candidates_before_write()
returns trigger
language plpgsql
as $$
declare
  cv_text text;
begin
  new.phone_key := normalize_il_phone(new.phone);

  -- The current CV is read here, so every rebuild includes it.
  select d.extracted_text into cv_text
    from cv_documents d
   where d.candidate_id = new.id and d.is_current
   limit 1;

  new.search_text := lower(concat_ws(' ',
    new.first_name, new.last_name, new.email, new.phone,
    -- Digits only as well, so "052-767-4311" and "0527674311" both find her.
    nullif(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), ''), new.phone_key,
    new.city,
    array_to_string(new.preferred_regions, ' '),
    new.institution, new.cohort_year::text,
    array_to_string(new.programming_languages, ' '),
    array_to_string(new.technologies, ' '),
    array_to_string(new.role_types, ' '),
    array_to_string(new.spoken_languages, ' '),
    array_to_string(new.tags, ' '),
    new.seniority, new.experience_years,
    new.notes_from_candidate, new.notes_internal,
    left(cv_text, 100000)
  ));

  -- Only a real change is an update. Rebuilding search_text (a new CV version,
  -- the backfill below) must not make an old record look freshly edited.
  if tg_op = 'UPDATE'
     and new.updated_at is not distinct from old.updated_at
     and (to_jsonb(new) - array['search_text', 'updated_at', 'phone_key'])
         is distinct from (to_jsonb(old) - array['search_text', 'updated_at', 'phone_key']) then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

-- A CV change now just touches the candidate; the trigger above does the rest.
create or replace function cv_after_parse()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    update candidates set search_text = null where id = new.candidate_id;
  end if;
  -- A document moved to another candidate (duplicate merge) or deleted.
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.candidate_id is distinct from new.candidate_id) then
    update candidates set search_text = null where id = old.candidate_id;
  end if;
  return null;
end;
$$;

drop trigger if exists cv_after_parse_trg on cv_documents;
create trigger cv_after_parse_trg
  after insert or delete or update of extracted_text, is_current, candidate_id on cv_documents
  for each row execute function cv_after_parse();

-- ---------------------------------------------------------------------------
-- 2. A shared phone is not the same person.
--
-- Two sisters listing the family phone were merged into one record, and the
-- second one's email was lost. Phone now only identifies someone when there is
-- no email on one side to contradict it — and the phone is no longer unique.
-- ---------------------------------------------------------------------------
create or replace function find_candidate_match(p_email text, p_phone text)
returns uuid
language sql
stable
as $$
  select coalesce(
    (select id from candidates
      where deleted_at is null
        and email_key is not null
        and email_key = nullif(lower(trim(p_email)), '')
      limit 1),
    (select id from candidates
      where deleted_at is null
        and phone_key is not null
        and phone_key = normalize_il_phone(p_phone)
        and (nullif(lower(trim(p_email)), '') is null or email_key is null)
      order by created_at
      limit 1)
  );
$$;

drop index if exists candidates_phone_key_uniq;
create index if not exists candidates_phone_key_idx
  on candidates (phone_key) where phone_key is not null and deleted_at is null;

-- ---------------------------------------------------------------------------
-- 3. A campaign is sent once, even if the request is repeated.
-- ---------------------------------------------------------------------------
alter table campaigns add column if not exists client_key text unique;

-- ---------------------------------------------------------------------------
-- 4. Importing the same folder twice must not pay to read the same file twice.
-- ---------------------------------------------------------------------------
alter table cv_documents add column if not exists content_sha256 text;
create index if not exists cv_documents_sha256_idx
  on cv_documents (content_sha256) where content_sha256 is not null;

-- ---------------------------------------------------------------------------
-- 5. Files now go straight from the browser to Storage (the server has a
--    4.5MB request limit). The bucket enforces the size the UI promises.
-- ---------------------------------------------------------------------------
update storage.buckets
   set file_size_limit = 15 * 1024 * 1024
 where id in ('cvs', 'requirements');

-- ---------------------------------------------------------------------------
-- 6. Candidates never write their row directly — profile edits go through
--    /api/candidate — so this policy only allowed editing internal columns
--    (notes_internal, status, consent) from a candidate session.
-- ---------------------------------------------------------------------------
drop policy if exists candidates_self_update on candidates;

-- ---------------------------------------------------------------------------
-- 7. Rebuild search_text for everyone, now that it includes the CV.
-- ---------------------------------------------------------------------------
update candidates set search_text = null;
