-- "מעוניינת למצוא עבודה באזור" הופך מאזור יחיד לרשימת אזורים.
-- מועמדת אחת יכולה להיות רלוונטית למרכז, לשרון ולעבודה מרחוק בו-זמנית,
-- והסינון בניהול אמור למצוא אותה בכל אחד מהם.

alter table candidates
  alter column preferred_region drop default,
  alter column preferred_region type text[]
    using case
      when preferred_region is null or btrim(preferred_region) = '' then null
      else array[btrim(preferred_region)]
    end;

alter table candidates rename column preferred_region to preferred_regions;

-- הטריגר בונה את שדה החיפוש החופשי — צריך לשרשר מערך במקום טקסט
create or replace function candidates_before_write()
returns trigger
language plpgsql
as $$
begin
  new.phone_key := normalize_il_phone(new.phone);
  new.search_text := lower(concat_ws(' ',
    new.first_name, new.last_name, new.email, new.phone, new.city,
    array_to_string(new.preferred_regions, ' '),
    new.institution, new.cohort_year::text,
    array_to_string(new.programming_languages, ' '),
    array_to_string(new.technologies, ' '),
    array_to_string(new.role_types, ' '),
    array_to_string(new.spoken_languages, ' '),
    array_to_string(new.tags, ' '),
    new.seniority, new.experience_years,
    new.notes_from_candidate, new.notes_internal
  ));
  return new;
end;
$$;

-- אינדקס שמאיץ סינון "כל מי שרלוונטית לאזור X"
create index if not exists candidates_preferred_regions_idx
  on candidates using gin (preferred_regions);
