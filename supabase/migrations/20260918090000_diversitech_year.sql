-- שנת הפרקטיקום של DiversiTech: "בוגרת" לבד לא אומר ממתי.

alter table candidates add column if not exists diversitech_year int;

alter table candidates drop constraint if exists candidates_diversitech_year_range;
alter table candidates add constraint candidates_diversitech_year_range
  check (diversitech_year is null or (diversitech_year between 2000 and 2100));

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
    case when new.diversitech_practicum
         then concat_ws(' ', 'diversitech דיברסיטק פרקטיקום', new.diversitech_year::text) end,
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

update candidates set search_text = null where diversitech_practicum;
