-- =====================================================================
-- ÖRNEK VERİ — YALNIZCA YEREL GELİŞTİRME VE SUNUM İÇİNDİR
-- `npx supabase db reset` komutu göçlerden (migrations) sonra bu dosyayı çalıştırır.
-- Canlı (production) veritabanına UYGULANMAZ: `supabase db push` seed dosyasını çalıştırmaz.
--
-- Tüm örnek hesapların şifresi: Demo1234
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- Örnek kullanıcıyı Supabase Auth tablolarına ekler; profil, kayıt tetikleyicisiyle oluşur
create function pg_temp.ornek_kullanici(p_email text, p_meta jsonb)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('Demo1234', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', p_meta, now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
  return v_id;
end;
$$;

create function pg_temp.beceri(p_ad text)
returns integer language sql as $$ select id from public.skills where name = p_ad $$;

do $$
declare
  yonetici uuid; ayse uuid; mehmet uuid; zeynep uuid; can uuid;
  deniz uuid; selin uuid; bekleyen uuid;
  p_kutuphane uuid; p_etkinlik uuid; p_ders uuid; p_yemekhane uuid; p_staj uuid;
  b record;
begin
  -- ---------- Kullanıcılar ----------
  yonetici := pg_temp.ornek_kullanici('yonetici@demo.edu.tr',
    '{"role": "student", "full_name": "Platform Yöneticisi", "department": "Diğer", "class_year": "4"}');
  update public.profiles set role = 'admin' where id = yonetici;

  ayse := pg_temp.ornek_kullanici('ayse@ogr.demo.edu.tr',
    '{"role": "student", "full_name": "Ayşe Yılmaz", "department": "Bilgisayar Mühendisliği", "class_year": "3"}');
  mehmet := pg_temp.ornek_kullanici('mehmet@ogr.demo.edu.tr',
    '{"role": "student", "full_name": "Mehmet Kaya", "department": "Yazılım Mühendisliği", "class_year": "2"}');
  zeynep := pg_temp.ornek_kullanici('zeynep@ogr.demo.edu.tr',
    '{"role": "student", "full_name": "Zeynep Demir", "department": "Bilgisayar Mühendisliği", "class_year": "4"}');
  can := pg_temp.ornek_kullanici('can@ogr.demo.edu.tr',
    '{"role": "student", "full_name": "Can Arslan", "department": "Yönetim Bilişim Sistemleri", "class_year": "3"}');

  deniz := pg_temp.ornek_kullanici('deniz@demo-mentor.com',
    '{"role": "mentor", "full_name": "Deniz Şahin", "title": "Kıdemli Yazılım Mühendisi", "expertise": "Web Geliştirme", "experience_years": 8, "mentor_capacity": 2}');
  selin := pg_temp.ornek_kullanici('selin@demo-mentor.com',
    '{"role": "mentor", "full_name": "Selin Aydın", "title": "Veri Bilimci", "expertise": "Veri Bilimi / Yapay Zeka", "experience_years": 5, "mentor_capacity": 2}');
  bekleyen := pg_temp.ornek_kullanici('emre@demo-mentor.com',
    '{"role": "mentor", "full_name": "Emre Çelik", "title": "Mobil Geliştirici", "expertise": "Mobil Geliştirme", "experience_years": 4, "mentor_capacity": 1}');
  update public.profiles set mentor_status = 'approved' where id in (deniz, selin);

  update public.profiles set bio = 'Web ve mobil projelerde arayüz geliştirmeyi seviyorum.' where id = ayse;
  update public.profiles set bio = 'Sekiz yıldır web uygulamaları geliştiriyorum. Öğrencilere proje planlama ve kod incelemede destek oluyorum.' where id = deniz;
  update public.profiles set bio = 'Makine öğrenmesi projelerinde veri hazırlama ve model seçimi konusunda yardımcı olurum.' where id = selin;

  -- ---------- Beceriler ----------
  for b in select * from (values
    (ayse, 'HTML / CSS', 5), (ayse, 'JavaScript', 4), (ayse, 'React', 3), (ayse, 'Git', 3),
    (mehmet, 'Python', 4), (mehmet, 'Yapay Zeka', 3), (mehmet, 'SQL / Veritabanı', 3),
    (zeynep, 'Flutter', 4), (zeynep, 'Firebase', 3), (zeynep, 'UI / UX Tasarımı', 4),
    (can, 'JavaScript', 3), (can, 'Node.js', 3), (can, 'SQL / Veritabanı', 4), (can, 'HTML / CSS', 3),
    (deniz, 'React', 5), (deniz, 'JavaScript', 5), (deniz, 'Node.js', 4), (deniz, 'Git', 5),
    (selin, 'Python', 5), (selin, 'Yapay Zeka', 5), (selin, 'Veri Analizi', 4),
    (bekleyen, 'Flutter', 5), (bekleyen, 'Kotlin', 4)
  ) as t(kisi, ad, seviye)
  loop
    insert into public.profile_skills (profile_id, skill_id, level) values (b.kisi, pg_temp.beceri(b.ad), b.seviye);
  end loop;

  -- ---------- Projeler (lider, tetikleyiciyle takıma eklenir) ----------
  insert into public.projects (owner_id, title, description, team_size, duration_weeks)
  values (ayse, 'Kütüphane Doluluk Takibi',
    'Kütüphane salonlarının anlık doluluk oranını gösteren web sitesi. Görevliler sayım girer, öğrenciler boş salonları renklerle görür.', 3, 8)
  returning id into p_kutuphane;
  insert into public.projects (owner_id, title, description, team_size, duration_weeks)
  values (zeynep, 'Kampüs Etkinlik Uygulaması',
    'Kulüp ve etkinlik duyurularını tek yerde toplayan, hatırlatma gönderen mobil uygulama.', 4, 10)
  returning id into p_etkinlik;
  insert into public.projects (owner_id, title, description, team_size, duration_weeks)
  values (mehmet, 'Ders Notu Öneri Sistemi',
    'Öğrencilere aldıkları derslere göre kaynak ve ders notu öneren, makine öğrenmesi tabanlı sistem.', 3, 12)
  returning id into p_ders;
  insert into public.projects (owner_id, title, description, team_size, duration_weeks)
  values (can, 'Yemekhane Menü Uygulaması',
    'Günlük menüyü ve kalori bilgisini gösteren, yemeklerin oylanabildiği web uygulaması.', 3, 6)
  returning id into p_yemekhane;
  insert into public.projects (owner_id, title, description, team_size, duration_weeks)
  values (can, 'Staj İlanları Panosu',
    'Bölümlere göre staj ilanlarını listeleyen ve son başvuru tarihinden önce hatırlatan site.', 4, 8)
  returning id into p_staj;

  insert into public.project_skills (project_id, skill_id) values
    (p_kutuphane, pg_temp.beceri('HTML / CSS')), (p_kutuphane, pg_temp.beceri('JavaScript')),
    (p_kutuphane, pg_temp.beceri('Duyarlı Tasarım')),
    (p_etkinlik, pg_temp.beceri('Flutter')), (p_etkinlik, pg_temp.beceri('Firebase')),
    (p_etkinlik, pg_temp.beceri('UI / UX Tasarımı')),
    (p_ders, pg_temp.beceri('Python')), (p_ders, pg_temp.beceri('Yapay Zeka')),
    (p_ders, pg_temp.beceri('SQL / Veritabanı')),
    (p_yemekhane, pg_temp.beceri('React')), (p_yemekhane, pg_temp.beceri('Node.js')),
    (p_staj, pg_temp.beceri('React')), (p_staj, pg_temp.beceri('HTML / CSS')),
    (p_staj, pg_temp.beceri('SQL / Veritabanı'));

  -- ---------- Başvurular ----------
  insert into public.applications (project_id, student_id, message)
  values (p_kutuphane, can, 'Veritabanı ve JavaScript tarafında destek olabilirim, sayım paneli ilgimi çekiyor.');
  insert into public.applications (project_id, student_id, message)
  values (p_yemekhane, ayse, 'Arayüz tasarımı ve React bileşenlerini ben üstlenebilirim.');
  update public.applications set status = 'accepted' where project_id = p_yemekhane and student_id = ayse;
  -- Takım kuruldu, proje çalışmaya başladı
  update public.projects set status = 'in_progress' where id = p_yemekhane;
  insert into public.applications (project_id, student_id, message)
  values (p_ders, ayse, 'Veri görselleştirme kısmında yer almak isterim.');

  -- ---------- Mentörlük ----------
  insert into public.mentor_requests (project_id, mentor_id, message)
  values (p_yemekhane, deniz, 'React ve Node.js ile ilk projemiz, kod incelemesi ve mimari konusunda desteğinizi isteriz.');
  perform set_config('app.mentor_assignment', 'on', true);
  update public.projects set mentor_id = deniz where id = p_yemekhane;
  update public.mentor_requests set status = 'accepted', decided_at = now() where project_id = p_yemekhane;
  insert into public.mentor_requests (project_id, mentor_id, message)
  values (p_ders, selin, 'Model seçimi ve veri hazırlama konusunda mentörlüğünüze ihtiyacımız var.');

  -- ---------- Görüşme ve mesajlar ----------
  insert into public.meetings (project_id, created_by, starts_at, duration_min, meeting_url, note)
  values (p_yemekhane, deniz, date_trunc('day', now()) + interval '2 days 14 hours', 45,
          'https://meet.google.com/demo-gorusme', 'Veritabanı tasarımının gözden geçirilmesi');
  insert into public.messages (project_id, sender_id, content, created_at) values
    (p_yemekhane, can, 'Merhaba ekip! İlk sprinti planlayalım mı?', now() - interval '2 hours'),
    (p_yemekhane, ayse, 'Olur, menü listesi ekranından başlayabilirim.', now() - interval '90 minutes'),
    (p_yemekhane, deniz, 'Görüşmeden önce veritabanı şemasını paylaşırsanız inceleyebilirim.', now() - interval '1 hour');
end;
$$;
