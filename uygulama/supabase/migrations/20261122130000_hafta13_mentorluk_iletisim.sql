-- =====================================================================
-- Hafta 13: Mentörlük talepleri, görüşmeler, ekip mesajları ve bildirimler
-- =====================================================================

create type public.request_status as enum ('pending', 'accepted', 'rejected', 'cancelled');

-- ---------- Tablolar ----------

create table public.mentor_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(message) between 10 and 1000),
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create unique index mentor_requests_one_pending
  on public.mentor_requests (project_id, mentor_id)
  where status = 'pending';
create index on public.mentor_requests (mentor_id);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  duration_min smallint not null default 30 check (duration_min between 15 and 240),
  meeting_url text check (meeting_url ~ '^https://' and char_length(meeting_url) <= 500),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index on public.meetings (project_id, starts_at);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index on public.messages (project_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.notifications (user_id, created_at desc);

-- ---------- Yardımcılar ----------

create function public.is_project_mentor(p_project uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.projects where id = p_project and mentor_id = (select auth.uid())
  );
$$;

-- Bildirim oluşturur (yalnızca tetikleyiciler ve sunucu fonksiyonları çağırır)
create function public.notify(p_user uuid, p_type text, p_payload jsonb)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, type, payload) values (p_user, p_type, p_payload);
$$;

revoke execute on function public.notify(uuid, text, jsonb) from public, anon, authenticated;

-- ---------- Mentörlük talepleri ----------

create function public.check_new_mentor_request()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_project public.projects;
  v_mentor public.profiles;
begin
  select * into v_project from public.projects where id = new.project_id;
  select * into v_mentor from public.profiles where id = new.mentor_id;

  if v_mentor.role is distinct from 'mentor' or v_mentor.mentor_status is distinct from 'approved'
     or v_mentor.is_suspended then
    raise exception 'Talep yalnızca onaylı mentörlere gönderilebilir.';
  end if;
  if v_project.mentor_id is not null then
    raise exception 'Bu projenin zaten bir mentörü var.';
  end if;
  if v_project.status not in ('open', 'in_progress') then
    raise exception 'Tamamlanmış ya da iptal edilmiş projeye mentör istenemez.';
  end if;
  if public.mentor_active_count(new.mentor_id) >= v_mentor.mentor_capacity then
    raise exception 'Bu mentörün kapasitesi dolu.';
  end if;
  if exists (
    select 1 from public.mentor_requests
    where project_id = new.project_id and mentor_id = new.mentor_id and status = 'pending'
  ) then
    raise exception 'Bu mentöre zaten bekleyen bir talebin var.';
  end if;

  new.status := 'pending';
  new.created_at := now();
  new.decided_at := null;
  return new;
end;
$$;

create trigger mentor_requests_check_new
  before insert on public.mentor_requests
  for each row execute function public.check_new_mentor_request();

-- Mentör talebi kabul eder / reddeder (FR-23)
create function public.respond_mentor_request(p_request uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_req public.mentor_requests;
  v_capacity smallint;
begin
  select * into v_req from public.mentor_requests where id = p_request for update;
  if v_req.id is null or v_req.mentor_id is distinct from (select auth.uid()) then
    raise exception 'Bu talebi yanıtlama yetkin yok.';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'Bu talep zaten yanıtlandı.';
  end if;

  if not p_accept then
    update public.mentor_requests set status = 'rejected', decided_at = now() where id = p_request;
    return;
  end if;

  select mentor_capacity into v_capacity from public.profiles where id = v_req.mentor_id;
  if public.mentor_active_count(v_req.mentor_id) >= v_capacity then
    raise exception 'Kapasiten dolu; yeni bir projeye mentörlük yapamazsın.';
  end if;
  if exists (select 1 from public.projects where id = v_req.project_id and mentor_id is not null) then
    raise exception 'Bu projeye başka bir mentör atanmış.';
  end if;

  perform set_config('app.mentor_assignment', 'on', true);
  update public.projects set mentor_id = v_req.mentor_id where id = v_req.project_id;
  perform set_config('app.mentor_assignment', '', true);

  update public.mentor_requests set status = 'accepted', decided_at = now() where id = p_request;
  -- Projenin diğer bekleyen talepleri artık geçersiz
  update public.mentor_requests
    set status = 'cancelled', decided_at = now()
    where project_id = v_req.project_id and status = 'pending';
end;
$$;

-- Proje lideri bekleyen talebini geri alır
create function public.cancel_mentor_request(p_request uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.mentor_requests r
    set status = 'cancelled', decided_at = now()
    where r.id = p_request
      and r.status = 'pending'
      and exists (
        select 1 from public.projects p where p.id = r.project_id and p.owner_id = (select auth.uid())
      );
  if not found then
    raise exception 'Bu talebi geri alma yetkin yok ya da talep zaten yanıtlandı.';
  end if;
end;
$$;

revoke execute on function public.respond_mentor_request(uuid, boolean) from public, anon;
revoke execute on function public.cancel_mentor_request(uuid) from public, anon;
grant execute on function public.respond_mentor_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_mentor_request(uuid) to authenticated;

-- ---------- Bildirim tetikleyicileri (FR-26) ----------

create function public.notify_on_application()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_project public.projects;
  v_student text;
begin
  select * into v_project from public.projects where id = new.project_id;
  select full_name into v_student from public.profiles where id = new.student_id;

  if tg_op = 'INSERT' then
    perform public.notify(v_project.owner_id, 'new_application',
      jsonb_build_object('project_id', v_project.id, 'project_title', v_project.title, 'name', v_student));
  elsif new.status in ('accepted', 'rejected') and old.status = 'pending' then
    perform public.notify(new.student_id, 'application_' || new.status,
      jsonb_build_object('project_id', v_project.id, 'project_title', v_project.title));
  end if;
  return new;
end;
$$;

create trigger applications_notify
  after insert or update of status on public.applications
  for each row execute function public.notify_on_application();

create function public.notify_on_mentor_request()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_project public.projects;
  v_mentor text;
begin
  select * into v_project from public.projects where id = new.project_id;
  select full_name into v_mentor from public.profiles where id = new.mentor_id;

  if tg_op = 'INSERT' then
    perform public.notify(new.mentor_id, 'mentor_request',
      jsonb_build_object('project_id', v_project.id, 'project_title', v_project.title));
  elsif new.status in ('accepted', 'rejected') and old.status = 'pending' then
    perform public.notify(v_project.owner_id, 'mentor_request_' || new.status,
      jsonb_build_object('project_id', v_project.id, 'project_title', v_project.title, 'name', v_mentor));
  end if;
  return new;
end;
$$;

create trigger mentor_requests_notify
  after insert or update of status on public.mentor_requests
  for each row execute function public.notify_on_mentor_request();

create function public.notify_on_meeting()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_project public.projects;
  v_kisi uuid;
begin
  select * into v_project from public.projects where id = new.project_id;
  for v_kisi in
    select profile_id from public.project_members where project_id = new.project_id
    union
    select v_project.mentor_id where v_project.mentor_id is not null
  loop
    if v_kisi <> new.created_by then
      perform public.notify(v_kisi, 'meeting_planned',
        jsonb_build_object('project_id', v_project.id, 'project_title', v_project.title,
                           'starts_at', new.starts_at));
    end if;
  end loop;
  return new;
end;
$$;

create trigger meetings_notify
  after insert on public.meetings
  for each row execute function public.notify_on_meeting();

-- ---------- RLS ----------

alter table public.mentor_requests enable row level security;
alter table public.meetings enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create policy "Talebi mentör, proje lideri ve yönetici görür" on public.mentor_requests
  for select to authenticated
  using (mentor_id = (select auth.uid()) or public.is_project_owner(project_id) or public.is_admin());
create policy "Proje lideri mentörlük talebi gönderir" on public.mentor_requests
  for insert to authenticated
  with check (public.is_project_owner(project_id) and public.is_active_user());

create policy "Görüşmeleri proje ekibi görür" on public.meetings
  for select to authenticated
  using (public.is_project_participant(project_id) or public.is_admin());
create policy "Lider ya da mentör görüşme planlar" on public.meetings
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (public.is_project_owner(project_id) or public.is_project_mentor(project_id))
    and public.is_active_user()
  );
create policy "Görüşmeyi oluşturan ya da lider siler" on public.meetings
  for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_project_owner(project_id));

-- Mesajları yalnızca proje ekibi (üyeler + mentör) görür; yönetici de göremez (gizlilik)
create policy "Ekip mesajlarını ekip görür" on public.messages
  for select to authenticated
  using (public.is_project_participant(project_id));
create policy "Ekip üyesi mesaj gönderir" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_project_participant(project_id)
    and public.is_active_user()
  );

create policy "Kullanıcı kendi bildirimlerini görür" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Kullanıcı kendi bildirimini okundu yapar" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert on public.mentor_requests to authenticated;
grant select, insert, delete on public.meetings to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.notifications to authenticated;
-- Bildirimde yalnızca "okundu" bilgisi değiştirilebilir
grant update (read_at) on public.notifications to authenticated;

-- ---------- Anlık güncellemeler (Supabase Realtime) ----------
alter publication supabase_realtime add table public.messages, public.notifications;
