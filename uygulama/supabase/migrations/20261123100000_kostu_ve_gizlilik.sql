-- =====================================================================
-- KOSTÜ'ye özel kayıt kuralları ve ziyaretçi gizliliği
-- =====================================================================

-- ---------- KOSTÜ e-posta kuralları ----------
-- Öğrenci e-postası: <9 haneli öğrenci numarası>@kocaelisaglik.edu.tr
-- Numara: YY FF BB SSS -> giriş yılı, fakülte, bölüm, bölümdeki sıra (ör. 24 05 02 016)
-- Mentörler KOSTÜ personelidir: ad.soyad@kocaelisaglik.edu.tr

-- E-posta öğrenci biçimindeyse numarayı, değilse null döndürür
create function public.kostu_ogrenci_no(p_email text)
returns text
language sql immutable set search_path = ''
as $$
  select (regexp_match(lower(trim(p_email)), '^([0-9]{9})@kocaelisaglik\.edu\.tr$'))[1];
$$;

-- Giriş yılına göre öğrencinin bu eğitim yılında olabileceği en yüksek sınıf.
-- Eğitim yılı Eylül'de başlar: 2024 girişli öğrenci Eylül 2026'dan itibaren en fazla 3. sınıftır.
create function public.kostu_azami_sinif(p_no text)
returns integer
language sql stable set search_path = ''
as $$
  select greatest(
    1,
    extract(year from (now() at time zone 'Europe/Istanbul') - interval '8 months')::integer
      - (2000 + substr(p_no, 1, 2)::integer) + 1
  );
$$;

-- Kurala uymayan e-postada Türkçe hata fırlatır (kayıtta ve e-posta değişikliğinde kullanılır)
create function public.kostu_eposta_dogrula(
  p_email text,
  p_role public.user_role,
  p_class smallint default null
)
returns void
language plpgsql stable set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_no text := public.kostu_ogrenci_no(p_email);
  v_yil integer;
  v_bu_yil integer := extract(year from now() at time zone 'Europe/Istanbul')::integer % 100;
begin
  if v_email !~ '^[^@\s]+@kocaelisaglik\.edu\.tr$' then
    raise exception 'Yalnızca KOSTÜ e-posta adresiyle (@kocaelisaglik.edu.tr) kayıt olunabilir.';
  end if;

  if p_role = 'student' then
    if v_no is null then
      raise exception 'Öğrenci e-postası 9 haneli öğrenci numarasıyla başlamalı (ör. 24xxxxxxx@kocaelisaglik.edu.tr).';
    end if;
    v_yil := substr(v_no, 1, 2)::integer;
    if v_yil < 20 or v_yil > v_bu_yil then
      -- KOSTÜ 2020'de kuruldu; gelecek yılın numarası da olamaz
      raise exception 'Öğrenci numarasının ilk iki hanesi (giriş yılı) 20 ile % arasında olmalı.', v_bu_yil;
    end if;
    if substr(v_no, 3, 2) = '00' or substr(v_no, 5, 2) = '00' or substr(v_no, 7, 3) = '000' then
      raise exception 'Bu numara geçerli bir KOSTÜ öğrenci numarası değil.';
    end if;
    if p_class is not null and p_class > public.kostu_azami_sinif(v_no) then
      raise exception '20% girişli bir öğrenci en fazla %. sınıf olabilir.',
        lpad(v_yil::text, 2, '0'), public.kostu_azami_sinif(v_no);
    end if;
  elsif p_role = 'mentor' and split_part(v_email, '@', 1) ~ '^[0-9]+$' then
    raise exception 'Mentör kaydı için KOSTÜ personel e-postası gerekir (ör. ad.soyad@kocaelisaglik.edu.tr). Öğrenci numarasıyla mentör olunamaz.';
  end if;
end;
$$;

-- Kayıt tetikleyicisi: .edu.tr kuralı yerine KOSTÜ kuralları
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role public.user_role := case when v_meta ->> 'role' = 'mentor' then 'mentor' else 'student' end;
begin
  -- Arayüz de kontrol ediyor ama asıl kural burada: API'ye doğrudan istek atılsa da geçerli.
  perform public.kostu_eposta_dogrula(
    new.email,
    v_role,
    case when v_role = 'student' then nullif(v_meta ->> 'class_year', '')::smallint end
  );

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

-- Kayıttan sonra e-posta KOSTÜ dışı bir adrese değiştirilemesin
create function public.check_email_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = new.id;
  perform public.kostu_eposta_dogrula(new.email, coalesce(v_role, 'student'));
  return new;
end;
$$;

create trigger on_auth_user_email_change
  before update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.check_email_change();

-- Öğrenci profilinde sınıfı, numarasındaki giriş yılına göre imkânsız bir değere çekemesin
create function public.check_class_year()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_no text;
begin
  if new.role = 'student' and new.class_year is not null then
    select public.kostu_ogrenci_no(email) into v_no from auth.users where id = new.id;
    if v_no is not null and new.class_year > public.kostu_azami_sinif(v_no) then
      raise exception '20% girişli bir öğrenci en fazla %. sınıf olabilir.',
        substr(v_no, 1, 2), public.kostu_azami_sinif(v_no);
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_check_class_year
  before update of class_year on public.profiles
  for each row
  when (old.class_year is distinct from new.class_year)
  execute function public.check_class_year();

-- ---------- Ziyaretçi gizliliği ----------
-- Ziyaretçi proje ayrıntılarını görür ama takımdaki kişilere ait hiçbir bilgiyi görmez:
-- ad, bölüm, sınıf zaten gizliydi (profiles RLS); artık üyelerin kimlikleri de gizli.
drop policy "Takım üyeleri görünür" on public.project_members;
create policy "Takım üyelerini giriş yapanlar görür" on public.project_members
  for select to authenticated using (true);

-- Takım doluluğu için yalnızca sayı: PostgREST'te `select=...,member_count` ile okunur
create function public.member_count(p public.projects)
returns integer
language sql stable security definer set search_path = ''
as $$
  select public.project_member_count(p.id);
$$;

grant execute on function public.member_count(public.projects) to anon, authenticated;

-- Supabase yeni tablolara ziyaretçiye (anon) varsayılan olarak tüm yetkileri verir.
-- RLS satırları korusa da ziyaretçinin yalnızca okuma yetkisi kalsın.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.skills, public.projects, public.project_skills, public.project_members,
  public.profiles, public.profile_skills to anon;
-- TRUNCATE RLS'e tabi değildir; API'den kullanılmasa da kimsede kalmasın
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
