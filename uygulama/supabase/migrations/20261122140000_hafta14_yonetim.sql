-- =====================================================================
-- Hafta 14: Şikâyetler ve yönetici paneli
-- =====================================================================

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('project', 'profile', 'message')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 10 and 500),
  -- Şikâyet edilen içeriğin o anki kopyası: yönetici ekip mesajlarının tamamını değil,
  -- yalnızca şikâyet edilen mesajı görebilsin (gizlilik)
  snapshot text,
  snapshot_owner uuid references public.profiles (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index on public.reports (status, created_at desc);

create function public.fill_report_snapshot()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.status := 'open';
  new.created_at := now();
  new.resolved_at := null;

  if new.target_type = 'project' then
    select title || E'\n\n' || description, owner_id into new.snapshot, new.snapshot_owner
      from public.projects where id = new.target_id;
  elsif new.target_type = 'profile' then
    select full_name || coalesce(E'\n\n' || bio, ''), id into new.snapshot, new.snapshot_owner
      from public.profiles where id = new.target_id;
  else
    -- Mesajı yalnızca o projenin ekibi şikâyet edebilir
    if not exists (
      select 1 from public.messages m
      where m.id = new.target_id and public.is_project_participant(m.project_id)
    ) then
      raise exception 'Bu mesajı şikâyet edemezsin.';
    end if;
    select content, sender_id into new.snapshot, new.snapshot_owner
      from public.messages where id = new.target_id;
  end if;

  if new.snapshot is null then
    raise exception 'Şikâyet edilen içerik bulunamadı.';
  end if;
  return new;
end;
$$;

create trigger reports_fill_snapshot
  before insert on public.reports
  for each row execute function public.fill_report_snapshot();

alter table public.reports enable row level security;

create policy "Aktif kullanıcı şikâyet eder" on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and public.is_active_user());
create policy "Şikâyetleri yönetici görür" on public.reports
  for select to authenticated using (public.is_admin());
create policy "Şikâyetleri yönetici sonuçlandırır" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.reports to authenticated;

-- ---------- Mentör onayı bildirimi ----------

create function public.notify_on_mentor_status()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.mentor_status is distinct from old.mentor_status
     and new.mentor_status in ('approved', 'rejected') then
    perform public.notify(new.id, 'mentor_' || new.mentor_status, '{}'::jsonb);
  end if;
  return new;
end;
$$;

create trigger profiles_notify_mentor_status
  after update of mentor_status on public.profiles
  for each row execute function public.notify_on_mentor_status();

-- ---------- Yönetici fonksiyonları ----------

-- Kullanıcı listesi (e-posta yalnızca yöneticiye gösterilir; mentör kimlik kontrolü için)
create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  mentor_status public.mentor_status,
  title text,
  expertise text,
  experience_years smallint,
  is_suspended boolean,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Bu işlem yalnızca yöneticiler içindir.';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.role, p.mentor_status, p.title, p.expertise,
           p.experience_years, p.is_suspended, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

-- Panel istatistikleri (FR-32)
create function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Bu işlem yalnızca yöneticiler içindir.';
  end if;
  return jsonb_build_object(
    'students', (select count(*) from public.profiles where role = 'student'),
    'mentors', (select count(*) from public.profiles where role = 'mentor' and mentor_status = 'approved'),
    'pending_mentors', (select count(*) from public.profiles where role = 'mentor' and mentor_status = 'pending'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'projects_by_status', coalesce((
      select jsonb_object_agg(status, n) from (
        select status, count(*) as n from public.projects group by status
      ) t
    ), '{}'::jsonb),
    'accepted_applications', (select count(*) from public.applications where status = 'accepted'),
    'mentored_projects', (select count(*) from public.projects where mentor_id is not null),
    'top_skills', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'count', n) order by n desc, name)
      from (
        select s.name, count(*) as n
        from public.project_skills ps join public.skills s on s.id = ps.skill_id
        group by s.name order by n desc, s.name limit 8
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_stats() to authenticated;

-- ---------- Yetki sıkılaştırma ----------
-- Supabase yeni tablolara varsayılan olarak tüm yetkileri verir. Satırlar RLS ile korunuyor;
-- ancak bildirimlerde yalnızca "okundu" sütununun değişebilmesi için tablo düzeyindeki
-- güncelleme yetkisi kaldırılıp yalnızca o sütuna verilir.
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke insert, delete on public.notifications from anon, authenticated;
