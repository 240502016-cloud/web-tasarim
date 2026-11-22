-- =====================================================================
-- Hafta 12: Eşleştirme (uygunluk puanı)
--
--   beceri_kapsama = sahip olunan gerekli beceri sayısı / gerekli beceri sayısı
--   seviye_puani   = uyan becerilerdeki ortalama seviye / 5
--   puan           = 100 × (0,7 × beceri_kapsama + 0,3 × seviye_puani)
--
-- Puan veritabanında hesaplanır; böylece tüm projeler tarayıcıya indirilmez.
-- Her öneri, puanın nedenini (uyan ve eksik beceriler) de döndürür (FR-15).
-- =====================================================================

-- Öğrenciye önerilen projeler (FR-12)
create function public.match_projects_for_student(p_limit integer default 12)
returns table (
  project_id uuid,
  score integer,
  matched_skills text[],
  missing_skills text[],
  required_count integer
)
language sql stable security invoker set search_path = ''
as $$
  with ben as (
    select p.id from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'student'
  ),
  becerilerim as (
    select ps.skill_id, ps.level from public.profile_skills ps join ben on ps.profile_id = ben.id
  ),
  adaylar as (
    -- Açık, takımı dolmamış, öğrencinin zaten içinde olmadığı ve başvurmadığı projeler
    select p.id, p.created_at
    from public.projects p, ben
    where p.status = 'open'
      and public.project_member_count(p.id) < p.team_size
      and not exists (
        select 1 from public.project_members m where m.project_id = p.id and m.profile_id = ben.id
      )
      and not exists (
        select 1 from public.applications a
        where a.project_id = p.id and a.student_id = ben.id and a.status in ('pending', 'accepted')
      )
  ),
  hesap as (
    select
      a.id,
      a.created_at,
      count(*) as gerekli,
      count(b.skill_id) as uyan,
      coalesce(avg(b.level), 0) as ortalama_seviye,
      array_agg(s.name order by s.name) filter (where b.skill_id is not null) as uyanlar,
      array_agg(s.name order by s.name) filter (where b.skill_id is null) as eksikler
    from adaylar a
    join public.project_skills ps on ps.project_id = a.id
    join public.skills s on s.id = ps.skill_id
    left join becerilerim b on b.skill_id = ps.skill_id
    group by a.id, a.created_at
  )
  select
    id,
    round(100 * (0.7 * uyan::numeric / gerekli + 0.3 * ortalama_seviye / 5))::integer,
    coalesce(uyanlar, '{}'),
    coalesce(eksikler, '{}'),
    gerekli::integer
  from hesap
  where uyan > 0
  order by 2 desc, created_at desc
  limit p_limit;
$$;

-- Proje liderine, projeye uygun ve kapasitesi dolmamış mentörler (FR-14)
create function public.match_mentors_for_project(p_project uuid, p_limit integer default 6)
returns table (
  mentor_id uuid,
  full_name text,
  title text,
  expertise text,
  score integer,
  matched_skills text[],
  required_count integer,
  active_projects integer,
  mentor_capacity smallint
)
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if not public.is_project_owner(p_project) then
    raise exception 'Mentör önerilerini yalnızca proje lideri görebilir.';
  end if;

  return query
  with gerekli as (
    select ps.skill_id, s.name from public.project_skills ps
    join public.skills s on s.id = ps.skill_id
    where ps.project_id = p_project
  ),
  mentorler as (
    select p.* from public.profiles p
    where p.role = 'mentor' and p.mentor_status = 'approved' and not p.is_suspended
      and public.mentor_active_count(p.id) < p.mentor_capacity
  ),
  hesap as (
    select
      m.id,
      count(ms.skill_id) as uyan,
      coalesce(avg(ms.level), 0) as ortalama_seviye,
      array_agg(g.name order by g.name) filter (where ms.skill_id is not null) as uyanlar
    from mentorler m
    cross join gerekli g
    left join public.profile_skills ms on ms.profile_id = m.id and ms.skill_id = g.skill_id
    group by m.id
  )
  select
    m.id,
    m.full_name,
    m.title,
    m.expertise,
    round(100 * (0.7 * h.uyan::numeric / (select count(*) from gerekli) + 0.3 * h.ortalama_seviye / 5))::integer,
    coalesce(h.uyanlar, '{}'),
    (select count(*) from gerekli)::integer,
    public.mentor_active_count(m.id),
    m.mentor_capacity
  from hesap h
  join mentorler m on m.id = h.id
  where h.uyan > 0
  order by 5 desc, (m.mentor_capacity - public.mentor_active_count(m.id)) desc, m.full_name
  limit p_limit;
end;
$$;

-- Proje liderine, projenin aradığı becerilere sahip öğrenciler (FR-13)
create function public.match_students_for_project(p_project uuid, p_limit integer default 6)
returns table (
  student_id uuid,
  full_name text,
  department text,
  class_year smallint,
  score integer,
  matched_skills text[],
  required_count integer
)
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if not public.is_project_owner(p_project) then
    raise exception 'Öğrenci önerilerini yalnızca proje lideri görebilir.';
  end if;

  return query
  with gerekli as (
    select ps.skill_id, s.name from public.project_skills ps
    join public.skills s on s.id = ps.skill_id
    where ps.project_id = p_project
  ),
  ogrenciler as (
    select p.* from public.profiles p
    where p.role = 'student' and not p.is_suspended
      and not exists (
        select 1 from public.project_members m where m.project_id = p_project and m.profile_id = p.id
      )
      and not exists (
        select 1 from public.applications a
        where a.project_id = p_project and a.student_id = p.id and a.status in ('pending', 'accepted')
      )
  ),
  hesap as (
    select
      o.id,
      count(os.skill_id) as uyan,
      coalesce(avg(os.level), 0) as ortalama_seviye,
      array_agg(g.name order by g.name) filter (where os.skill_id is not null) as uyanlar
    from ogrenciler o
    cross join gerekli g
    left join public.profile_skills os on os.profile_id = o.id and os.skill_id = g.skill_id
    group by o.id
  )
  select
    o.id,
    o.full_name,
    o.department,
    o.class_year,
    round(100 * (0.7 * h.uyan::numeric / (select count(*) from gerekli) + 0.3 * h.ortalama_seviye / 5))::integer,
    coalesce(h.uyanlar, '{}'),
    (select count(*) from gerekli)::integer
  from hesap h
  join ogrenciler o on o.id = h.id
  where h.uyan > 0
  order by 5 desc, o.full_name
  limit p_limit;
end;
$$;

revoke execute on function public.match_projects_for_student(integer) from public, anon;
revoke execute on function public.match_mentors_for_project(uuid, integer) from public, anon;
revoke execute on function public.match_students_for_project(uuid, integer) from public, anon;
grant execute on function public.match_projects_for_student(integer) to authenticated;
grant execute on function public.match_mentors_for_project(uuid, integer) to authenticated;
grant execute on function public.match_students_for_project(uuid, integer) to authenticated;
