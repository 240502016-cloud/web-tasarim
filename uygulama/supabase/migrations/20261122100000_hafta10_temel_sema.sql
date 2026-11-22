-- =====================================================================
-- Hafta 10: Temel şema, kayıt tetikleyicisi ve RLS (satır düzeyi güvenlik)
-- =====================================================================

-- ---------- Sabit değer listeleri ----------
create type public.user_role as enum ('student', 'mentor', 'admin');
create type public.mentor_status as enum ('pending', 'approved', 'rejected');
create type public.project_status as enum ('open', 'in_progress', 'completed', 'cancelled');

-- ---------- Tablolar ----------

-- Kullanıcı profili. E-posta ve şifre burada değil, Supabase Auth'ta (auth.users) tutulur.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  role public.user_role not null default 'student',
  -- öğrenci alanları
  department text check (char_length(department) <= 80),
  class_year smallint check (class_year between 1 and 6),
  -- mentör alanları
  title text check (char_length(title) <= 80),
  expertise text check (char_length(expertise) <= 80),
  experience_years smallint check (experience_years between 0 and 60),
  mentor_capacity smallint not null default 2 check (mentor_capacity between 1 and 10),
  mentor_status public.mentor_status,
  bio text check (char_length(bio) <= 1000),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);

-- Yöneticinin yönettiği beceri listesi (serbest metin değil: "JS" ve "JavaScript" aynı olsun)
create table public.skills (
  id integer generated always as identity primary key,
  name text not null unique check (char_length(name) between 1 and 40),
  category text check (char_length(category) <= 40)
);

create table public.profile_skills (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  skill_id integer not null references public.skills (id) on delete cascade,
  level smallint not null check (level between 1 and 5),
  primary key (profile_id, skill_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 20 and 4000),
  team_size smallint not null check (team_size between 2 and 10),
  duration_weeks smallint check (duration_weeks between 1 and 52),
  status public.project_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_skills (
  project_id uuid not null references public.projects (id) on delete cascade,
  skill_id integer not null references public.skills (id) on delete cascade,
  primary key (project_id, skill_id)
);

-- Takım üyeleri. Lider, proje oluşturulunca otomatik eklenir.
create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('leader', 'member')),
  joined_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create index on public.profile_skills (skill_id);
create index on public.projects (owner_id);
create index on public.projects (mentor_id);
create index on public.projects (status);
create index on public.project_skills (skill_id);
create index on public.project_members (profile_id);

-- ---------- Yardımcı fonksiyonlar (RLS politikalarında kullanılır) ----------

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and not is_suspended
  );
$$;

-- Askıda olmayan öğrenci, onaylı mentör ya da yönetici
create function public.is_active_user()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and not is_suspended
      and (role <> 'mentor' or mentor_status = 'approved')
  );
$$;

create function public.is_project_owner(p_project uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.projects where id = p_project and owner_id = (select auth.uid())
  );
$$;

-- Projenin üyesi (lider dahil) ya da mentörü
create function public.is_project_participant(p_project uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project and profile_id = (select auth.uid())
  ) or exists (
    select 1 from public.projects where id = p_project and mentor_id = (select auth.uid())
  );
$$;

create function public.project_member_count(p_project uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.project_members where project_id = p_project;
$$;

create function public.mentor_active_count(p_mentor uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.projects
  where mentor_id = p_mentor and status in ('open', 'in_progress');
$$;

-- ---------- Kayıt: auth.users'a eklenen her kullanıcı için profil oluştur ----------

create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role public.user_role := case when v_meta ->> 'role' = 'mentor' then 'mentor' else 'student' end;
begin
  -- Öğrenciler yalnızca üniversite e-postasıyla kayıt olabilir (FR-02).
  -- Arayüz de kontrol ediyor ama asıl kural burada: API'ye doğrudan istek atılsa da geçerli.
  if v_role = 'student' and new.email !~* '@([a-z0-9-]+\.)+edu\.tr$' then
    raise exception 'Öğrenci kaydı için .edu.tr uzantılı e-posta gerekir.';
  end if;

  insert into public.profiles (
    id, full_name, role, department, class_year,
    title, expertise, experience_years, mentor_capacity, mentor_status
  ) values (
    new.id,
    left(coalesce(nullif(trim(v_meta ->> 'full_name'), ''), 'Kullanıcı'), 80),
    v_role,
    case when v_role = 'student' then nullif(v_meta ->> 'department', '') end,
    case when v_role = 'student' then nullif(v_meta ->> 'class_year', '')::smallint end,
    case when v_role = 'mentor' then nullif(v_meta ->> 'title', '') end,
    case when v_role = 'mentor' then nullif(v_meta ->> 'expertise', '') end,
    case when v_role = 'mentor' then nullif(v_meta ->> 'experience_years', '')::smallint end,
    coalesce(nullif(v_meta ->> 'mentor_capacity', '')::smallint, 2),
    -- Mentörler yönetici onayına kadar beklemede (FR-04)
    case when v_role = 'mentor' then 'pending'::public.mentor_status end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Kullanıcı kendi rolünü / onay durumunu değiştiremesin ----------

create function public.protect_profile_columns()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- auth.uid() boşsa istek SQL editöründen ya da sunucu anahtarıyla gelmiştir (güvenilir)
  if (select auth.uid()) is not null and not public.is_admin() then
    new.role := old.role;
    new.mentor_status := old.mentor_status;
    new.is_suspended := old.is_suspended;
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------- Projeler: sahibi değiştirilemez, mentör yalnızca kurallı yolla atanır ----------

create function public.protect_project_columns()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if new.mentor_id is distinct from old.mentor_id
     and (select auth.uid()) is not null
     and not public.is_admin()
     and coalesce(current_setting('app.mentor_assignment', true), '') <> 'on'
     -- proje sahibi mentörü projeden çıkarabilir (null), ama kendisi atayamaz
     and new.mentor_id is not null then
    raise exception 'Mentör yalnızca mentörlük talebi kabul edilerek atanabilir.';
  end if;

  if new.team_size < public.project_member_count(new.id) then
    raise exception 'Takım büyüklüğü mevcut üye sayısından küçük olamaz.';
  end if;
  return new;
end;
$$;

create trigger projects_protect_columns
  before update on public.projects
  for each row execute function public.protect_project_columns();

-- Proje oluşturan kişi otomatik olarak takım lideri olur
create function public.add_project_leader()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.project_members (project_id, profile_id, member_role)
  values (new.id, new.owner_id, 'leader');
  return new;
end;
$$;

create trigger projects_add_leader
  after insert on public.projects
  for each row execute function public.add_project_leader();

-- ---------- RLS politikaları ----------

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;
alter table public.projects enable row level security;
alter table public.project_skills enable row level security;
alter table public.project_members enable row level security;

-- Profiller: yalnızca giriş yapmış kullanıcılar görür (ziyaretçiler mentör profillerini göremez)
create policy "Profilleri giriş yapanlar görebilir" on public.profiles
  for select to authenticated using (true);
create policy "Kullanıcı kendi profilini düzenler" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- Beceri listesi: herkes görür, yalnızca yönetici değiştirir
create policy "Beceriler herkese açık" on public.skills
  for select to anon, authenticated using (true);
create policy "Becerileri yönetici ekler" on public.skills
  for insert to authenticated with check (public.is_admin());
create policy "Becerileri yönetici düzenler" on public.skills
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Becerileri yönetici siler" on public.skills
  for delete to authenticated using (public.is_admin());

-- Kullanıcı becerileri: giriş yapanlar görür, herkes yalnızca kendi becerilerini değiştirir
create policy "Kullanıcı becerileri görünür" on public.profile_skills
  for select to authenticated using (true);
create policy "Kendi becerini ekle" on public.profile_skills
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "Kendi becerini güncelle" on public.profile_skills
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "Kendi becerini sil" on public.profile_skills
  for delete to authenticated using (profile_id = (select auth.uid()));

-- Projeler: herkes görür (iptal edilenleri yalnızca sahibi ve yönetici)
create policy "Projeler herkese açık" on public.projects
  for select to anon, authenticated
  using (status <> 'cancelled' or owner_id = (select auth.uid()) or public.is_admin());
create policy "Aktif kullanıcı proje oluşturur" on public.projects
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_active_user());
create policy "Proje sahibi düzenler" on public.projects
  for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());
create policy "Proje sahibi siler" on public.projects
  for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());

create policy "Proje becerileri herkese açık" on public.project_skills
  for select to anon, authenticated using (true);
create policy "Proje sahibi beceri ekler" on public.project_skills
  for insert to authenticated
  with check (public.is_project_owner(project_id) or public.is_admin());
create policy "Proje sahibi beceri siler" on public.project_skills
  for delete to authenticated
  using (public.is_project_owner(project_id) or public.is_admin());

-- Takım üyeleri: doluluk herkese gösterildiği için okunabilir.
-- Ekleme yalnızca tetikleyicilerle olur; üye ayrılabilir, lider üye çıkarabilir.
create policy "Takım üyeleri görünür" on public.project_members
  for select to anon, authenticated using (true);
create policy "Üye ayrılır veya lider çıkarır" on public.project_members
  for delete to authenticated
  using (
    member_role = 'member'
    and (profile_id = (select auth.uid()) or public.is_project_owner(project_id) or public.is_admin())
  );

-- ---------- Tablo yetkileri (RLS bunların üstüne uygulanır) ----------

grant select on public.skills, public.projects, public.project_skills, public.project_members
  to anon, authenticated;
-- Ziyaretçiye profil okuma izni verilir ama RLS politikası olmadığı için hiçbir satır dönmez.
-- (İzin hiç olmasa, profil bilgisi içeren proje sorguları ziyaretçide hata verirdi.)
grant select on public.profiles, public.profile_skills to anon;
grant select, update on public.profiles to authenticated;
grant insert, update, delete on public.skills, public.profile_skills, public.projects to authenticated;
grant select on public.profile_skills to authenticated;
grant insert, delete on public.project_skills to authenticated;
grant delete on public.project_members to authenticated;

-- ---------- API fonksiyonları ----------

-- Onaylı mentörler, becerileri ve aktif proje sayılarıyla (ziyaretçiye boş döner: RLS)
create function public.list_mentors(p_mentor uuid default null)
returns table (
  id uuid,
  full_name text,
  title text,
  expertise text,
  experience_years smallint,
  bio text,
  mentor_capacity smallint,
  active_projects integer,
  skills jsonb
)
language sql stable security invoker set search_path = ''
as $$
  select
    p.id, p.full_name, p.title, p.expertise, p.experience_years, p.bio, p.mentor_capacity,
    public.mentor_active_count(p.id),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'level', ps.level)
                       order by ps.level desc, s.name)
      from public.profile_skills ps
      join public.skills s on s.id = ps.skill_id
      where ps.profile_id = p.id
    ), '[]'::jsonb)
  from public.profiles p
  where p.role = 'mentor'
    and p.mentor_status = 'approved'
    and not p.is_suspended
    and (p_mentor is null or p.id = p_mentor)
  order by p.full_name;
$$;

-- Kullanıcının beceri listesini tek seferde (atomik olarak) değiştirir.
-- security invoker: RLS geçerli, kullanıcı yalnızca kendi becerilerini değiştirebilir.
create function public.set_my_skills(p_skills jsonb)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  delete from public.profile_skills where profile_id = (select auth.uid());
  insert into public.profile_skills (profile_id, skill_id, level)
  select (select auth.uid()), (e ->> 'skill_id')::integer, (e ->> 'level')::smallint
  from jsonb_array_elements(p_skills) as e;
end;
$$;

revoke execute on function public.set_my_skills(jsonb) from public, anon;
grant execute on function public.set_my_skills(jsonb) to authenticated;

-- KVKK: kullanıcı hesabını ve tüm verilerini silebilir (FR-07)
create function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Bu işlem için giriş yapmalısınız.';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- Başlangıç beceri listesi ----------

insert into public.skills (name, category) values
  ('HTML / CSS', 'Web'),
  ('JavaScript', 'Web'),
  ('TypeScript', 'Web'),
  ('React', 'Web'),
  ('Node.js', 'Web'),
  ('PHP', 'Web'),
  ('Duyarlı Tasarım', 'Tasarım'),
  ('UI / UX Tasarımı', 'Tasarım'),
  ('Flutter', 'Mobil'),
  ('Kotlin', 'Mobil'),
  ('Swift', 'Mobil'),
  ('Firebase', 'Mobil'),
  ('Python', 'Veri'),
  ('Yapay Zeka', 'Veri'),
  ('Veri Analizi', 'Veri'),
  ('SQL / Veritabanı', 'Veri'),
  ('Java', 'Genel'),
  ('C#', 'Genel'),
  ('C / C++', 'Gömülü'),
  ('Gömülü Sistemler', 'Gömülü'),
  ('Ağ Güvenliği', 'Güvenlik'),
  ('Git', 'Araçlar'),
  ('Test / QA', 'Araçlar'),
  ('Proje Yönetimi', 'Araçlar');
