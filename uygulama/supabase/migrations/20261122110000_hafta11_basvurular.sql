-- =====================================================================
-- Hafta 11: Proje oluşturma/düzenleme ve başvuru akışı
-- =====================================================================

create type public.application_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(message) between 10 and 1000),
  status public.application_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- Aynı öğrenci aynı projeye birden fazla aktif başvuru yapamaz (FR-17)
create unique index applications_one_active
  on public.applications (project_id, student_id)
  where status in ('pending', 'accepted');
create index on public.applications (student_id);

-- ---------- Başvuru oluşturulurken kurallar ----------

create function public.check_new_application()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_project public.projects;
begin
  if not exists (select 1 from public.profiles where id = new.student_id and role = 'student') then
    raise exception 'Projelere yalnızca öğrenciler başvurabilir.';
  end if;

  select * into v_project from public.projects where id = new.project_id;
  if v_project.status <> 'open' then
    raise exception 'Bu proje başvuruya açık değil.';
  end if;
  if public.project_member_count(new.project_id) >= v_project.team_size then
    raise exception 'Takım dolu, bu projeye başvuru alınmıyor.';
  end if;
  if exists (
    select 1 from public.project_members
    where project_id = new.project_id and profile_id = new.student_id
  ) then
    raise exception 'Zaten bu projenin takımındasın.';
  end if;
  if exists (
    select 1 from public.applications
    where project_id = new.project_id and student_id = new.student_id and status = 'pending'
  ) then
    raise exception 'Bu projeye zaten başvurdun.';
  end if;

  new.status := 'pending';
  new.created_at := now();
  new.decided_at := null;
  return new;
end;
$$;

create trigger applications_check_new
  before insert on public.applications
  for each row execute function public.check_new_application();

-- ---------- Başvuru durumu değişirken kurallar ----------
-- Lider: beklemede -> kabul / ret. Öğrenci: beklemede -> geri çekildi.

create function public.check_application_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_otomatik boolean := coalesce(current_setting('app.otomatik_islem', true), '') = 'on';
  v_project public.projects;
begin
  -- Başvurunun içeriği değiştirilemez, yalnızca durumu değişir
  new.project_id := old.project_id;
  new.student_id := old.student_id;
  new.message := old.message;
  new.created_at := old.created_at;

  if new.status = old.status then
    return new;
  end if;
  if old.status <> 'pending' then
    raise exception 'Bu başvuru zaten sonuçlandı.';
  end if;

  select * into v_project from public.projects where id = new.project_id;

  if new.status in ('accepted', 'rejected') then
    if not (v_otomatik or v_uid is null or v_uid = v_project.owner_id or public.is_admin()) then
      raise exception 'Başvuruları yalnızca proje lideri değerlendirebilir.';
    end if;
    if new.status = 'accepted'
       and public.project_member_count(new.project_id) >= v_project.team_size then
      raise exception 'Takım dolu, başvuru kabul edilemez.';
    end if;
  elsif new.status = 'withdrawn' then
    if v_uid is distinct from old.student_id then
      raise exception 'Başvuruyu yalnızca başvuran öğrenci geri çekebilir.';
    end if;
  else
    raise exception 'Geçersiz başvuru durumu.';
  end if;

  new.decided_at := now();
  return new;
end;
$$;

create trigger applications_check_update
  before update on public.applications
  for each row execute function public.check_application_update();

-- Kabul edilen öğrenci takıma eklenir; takım dolarsa bekleyen başvurular reddedilir (FR-18, FR-19)
create function public.after_application_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_team_size smallint;
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.project_members (project_id, profile_id, member_role)
    values (new.project_id, new.student_id, 'member')
    on conflict do nothing;

    select team_size into v_team_size from public.projects where id = new.project_id;
    if public.project_member_count(new.project_id) >= v_team_size then
      perform set_config('app.otomatik_islem', 'on', true);
      update public.applications
        set status = 'rejected'
        where project_id = new.project_id and status = 'pending';
      perform set_config('app.otomatik_islem', '', true);
    end if;
  end if;
  return new;
end;
$$;

create trigger applications_after_update
  after update on public.applications
  for each row execute function public.after_application_update();

-- ---------- RLS ----------

alter table public.applications enable row level security;

create policy "Başvuruyu öğrenci, proje lideri ve yönetici görür" on public.applications
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or public.is_project_owner(project_id)
    or public.is_admin()
  );
create policy "Aktif öğrenci kendi adına başvurur" on public.applications
  for insert to authenticated
  with check (student_id = (select auth.uid()) and public.is_active_user());
create policy "Öğrenci geri çeker, lider karar verir" on public.applications
  for update to authenticated
  using (student_id = (select auth.uid()) or public.is_project_owner(project_id) or public.is_admin())
  with check (student_id = (select auth.uid()) or public.is_project_owner(project_id) or public.is_admin());

grant select, insert, update on public.applications to authenticated;

-- ---------- Proje oluşturma ve düzenleme (proje + beceriler tek işlemde) ----------

create function public.create_project(
  p_title text,
  p_description text,
  p_team_size smallint,
  p_duration_weeks smallint,
  p_skill_ids integer[]
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(array_length(p_skill_ids, 1), 0) = 0 then
    raise exception 'En az bir gerekli beceri seçmelisin.';
  end if;

  insert into public.projects (owner_id, title, description, team_size, duration_weeks)
  values ((select auth.uid()), trim(p_title), trim(p_description), p_team_size, p_duration_weeks)
  returning id into v_id;

  insert into public.project_skills (project_id, skill_id)
  select v_id, unnest(p_skill_ids);

  return v_id;
end;
$$;

create function public.update_project(
  p_id uuid,
  p_title text,
  p_description text,
  p_team_size smallint,
  p_duration_weeks smallint,
  p_skill_ids integer[]
)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if coalesce(array_length(p_skill_ids, 1), 0) = 0 then
    raise exception 'En az bir gerekli beceri seçmelisin.';
  end if;

  update public.projects
    set title = trim(p_title),
        description = trim(p_description),
        team_size = p_team_size,
        duration_weeks = p_duration_weeks
    where id = p_id;
  if not found then
    raise exception 'Projeyi düzenleme yetkin yok.';
  end if;

  delete from public.project_skills where project_id = p_id and skill_id <> all (p_skill_ids);
  insert into public.project_skills (project_id, skill_id)
  select p_id, unnest(p_skill_ids)
  on conflict do nothing;
end;
$$;

revoke execute on function public.create_project(text, text, smallint, smallint, integer[]) from public, anon;
revoke execute on function public.update_project(uuid, text, text, smallint, smallint, integer[]) from public, anon;
grant execute on function public.create_project(text, text, smallint, smallint, integer[]) to authenticated;
grant execute on function public.update_project(uuid, text, text, smallint, smallint, integer[]) to authenticated;
