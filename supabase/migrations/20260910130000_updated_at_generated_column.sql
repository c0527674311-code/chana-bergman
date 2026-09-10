-- The previous migration compared NEW and OLD to decide whether a write is a
-- real change. But email_key is a generated column, and generated columns are
-- still NULL in NEW inside a BEFORE trigger, so every candidate with an email
-- looked changed and the search_text backfill bumped 53 records' updated_at.

create or replace function candidates_before_write()
returns trigger
language plpgsql
as $$
declare
  cv_text text;
begin
  new.phone_key := normalize_il_phone(new.phone);

  select d.extracted_text into cv_text
    from cv_documents d
   where d.candidate_id = new.id and d.is_current
   limit 1;

  new.search_text := lower(concat_ws(' ',
    new.first_name, new.last_name, new.email, new.phone,
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

  if tg_op = 'UPDATE'
     and new.updated_at is not distinct from old.updated_at
     and (to_jsonb(new) - array['search_text', 'updated_at', 'phone_key', 'email_key'])
         is distinct from (to_jsonb(old) - array['search_text', 'updated_at', 'phone_key', 'email_key']) then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

-- Undo the bump: those rows all share the backfill's transaction timestamp,
-- and before it every candidate's updated_at equalled created_at.
update candidates
   set updated_at = created_at
 where updated_at in (
   select updated_at from candidates group by updated_at having count(*) >= 40
 );
