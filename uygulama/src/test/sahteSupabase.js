// Sayfa testleri için sahte Supabase istemcisi.
// Veritabanından dönen satırları (İngilizce sütun adlarıyla) taklit eder; böylece
// api/ katmanındaki dönüşümler ve sayfalar gerçek veri biçimiyle test edilir.

export const KIMLIK = {
  ayse: "11111111-1111-4111-8111-111111111111",
  can: "22222222-2222-4222-8222-222222222222",
  deniz: "33333333-3333-4333-8333-333333333333",
  yonetici: "44444444-4444-4444-8444-444444444444",
  proje: "55555555-5555-4555-8555-555555555555",
  mehmet: "66666666-6666-4666-8666-666666666666",
};

const beceri = (id, name) => ({ id, name });
const PROFILLER = {
  [KIMLIK.ayse]: {
    id: KIMLIK.ayse,
    full_name: "Ayşe Yılmaz",
    role: "student",
    department: "Bilgisayar Mühendisliği",
    class_year: 3,
    bio: "Arayüz geliştirmeyi seviyorum.",
    is_suspended: false,
    mentor_status: null,
    mentor_capacity: 2,
    created_at: "2026-11-01T10:00:00Z",
    profile_skills: [
      { level: 5, skills: beceri(1, "HTML / CSS") },
      { level: 4, skills: beceri(2, "JavaScript") },
    ],
  },
  [KIMLIK.can]: {
    id: KIMLIK.can,
    full_name: "Can Arslan",
    role: "student",
    department: "Yönetim Bilişim Sistemleri",
    class_year: 3,
    bio: null,
    is_suspended: false,
    mentor_status: null,
    mentor_capacity: 2,
    created_at: "2026-11-01T10:00:00Z",
    profile_skills: [{ level: 3, skills: beceri(2, "JavaScript") }],
  },
  [KIMLIK.mehmet]: {
    id: KIMLIK.mehmet,
    full_name: "Mehmet Kaya",
    role: "student",
    department: "Yazılım Mühendisliği",
    class_year: 2,
    bio: null,
    is_suspended: false,
    mentor_status: null,
    mentor_capacity: 2,
    created_at: "2026-11-01T10:00:00Z",
    profile_skills: [],
  },
  [KIMLIK.yonetici]: {
    id: KIMLIK.yonetici,
    full_name: "Platform Yöneticisi",
    role: "admin",
    is_suspended: false,
    mentor_capacity: 2,
    created_at: "2026-11-01T10:00:00Z",
    profile_skills: [],
  },
};

const PROJE = {
  id: KIMLIK.proje,
  title: "Kütüphane Doluluk Takibi",
  description: "Salonların anlık doluluk oranını gösteren web sitesi.",
  status: "open",
  team_size: 3,
  duration_weeks: 8,
  created_at: "2026-11-03T10:00:00Z",
  owner_id: KIMLIK.ayse,
  mentor_id: null,
  owner: { id: KIMLIK.ayse, full_name: "Ayşe Yılmaz", department: "Bilgisayar Mühendisliği" },
  mentor: null,
  project_skills: [{ skills: beceri(1, "HTML / CSS") }, { skills: beceri(2, "JavaScript") }],
  project_members: [
    {
      profile_id: KIMLIK.ayse,
      member_role: "leader",
      joined_at: "2026-11-03T10:00:00Z",
      profile: {
        id: KIMLIK.ayse,
        full_name: "Ayşe Yılmaz",
        department: "Bilgisayar Mühendisliği",
        class_year: 3,
      },
    },
  ],
};

const TABLOLAR = {
  profiles: Object.values(PROFILLER),
  projects: [PROJE],
  project_members: [{ project_id: KIMLIK.proje, profile_id: KIMLIK.ayse }],
  skills: [beceri(1, "HTML / CSS"), beceri(2, "JavaScript"), beceri(3, "React")].map((s) => ({
    ...s,
    category: "Web",
  })),
  applications: [
    {
      id: "a1",
      project_id: KIMLIK.proje,
      student_id: KIMLIK.can,
      status: "pending",
      message: "Veritabanı tarafında destek olabilirim.",
      created_at: "2026-11-05T10:00:00Z",
      decided_at: null,
      student: { ...PROFILLER[KIMLIK.can] },
      project: { id: KIMLIK.proje, title: PROJE.title, status: "open" },
    },
  ],
  mentor_requests: [],
  meetings: [
    {
      id: "g1",
      project_id: KIMLIK.proje,
      created_by: KIMLIK.ayse,
      starts_at: "2099-01-10T11:00:00Z",
      duration_min: 30,
      meeting_url: "https://meet.google.com/abc",
      note: "Tanışma",
      project: { id: KIMLIK.proje, title: PROJE.title },
    },
  ],
  messages: [
    {
      id: "m1",
      project_id: KIMLIK.proje,
      sender_id: KIMLIK.ayse,
      content: "Merhaba ekip!",
      created_at: "2026-11-05T10:00:00Z",
      sender: { full_name: "Ayşe Yılmaz" },
    },
  ],
  notifications: [
    {
      id: "n1",
      user_id: KIMLIK.ayse,
      type: "new_application",
      read_at: null,
      created_at: "2026-11-05T10:00:00Z",
      payload: { project_id: KIMLIK.proje, project_title: PROJE.title, name: "Can Arslan" },
    },
  ],
  reports: [],
};

const RPC = {
  list_mentors: [
    {
      id: KIMLIK.deniz,
      full_name: "Deniz Şahin",
      title: "Yazılım Mühendisi",
      expertise: "Web Geliştirme",
      experience_years: 8,
      bio: "Kod incelemesi yaparım.",
      mentor_capacity: 2,
      active_projects: 0,
      skills: [{ id: 2, name: "JavaScript", level: 5 }],
    },
  ],
  match_projects_for_student: [
    {
      project_id: KIMLIK.proje,
      score: 75,
      matched_skills: ["HTML / CSS"],
      missing_skills: ["JavaScript"],
      required_count: 2,
    },
  ],
  match_mentors_for_project: [
    {
      mentor_id: KIMLIK.deniz,
      full_name: "Deniz Şahin",
      title: "Yazılım Mühendisi",
      expertise: "Web Geliştirme",
      score: 65,
      matched_skills: ["JavaScript"],
      required_count: 2,
      active_projects: 0,
      mentor_capacity: 2,
    },
  ],
  match_students_for_project: [],
  admin_stats: {
    students: 4,
    mentors: 2,
    pending_mentors: 1,
    open_reports: 0,
    accepted_applications: 3,
    mentored_projects: 1,
    projects_by_status: { open: 3, in_progress: 1 },
    top_skills: [{ name: "React", count: 2 }],
  },
  admin_list_users: [
    {
      id: KIMLIK.deniz,
      email: "deniz@ornek.com",
      full_name: "Deniz Şahin",
      role: "mentor",
      mentor_status: "pending",
      title: "Yazılım Mühendisi",
      expertise: "Web Geliştirme",
      experience_years: 8,
      is_suspended: false,
      created_at: "2026-11-01T10:00:00Z",
    },
  ],
};

// Zincirlenebilir sorgu: .select().eq().order()... sonunda await ile { data, error } döner
function sorgu(tablo) {
  let satirlar = [...(TABLOLAR[tablo] ?? [])];
  let sayim = false;
  const zincir = {
    select(_alanlar, secenek) {
      if (secenek?.head) sayim = true;
      return zincir;
    },
    eq(alan, deger) {
      satirlar = satirlar.filter((s) => !(alan in s) || s[alan] === deger);
      return zincir;
    },
    in(alan, degerler) {
      satirlar = satirlar.filter((s) => !(alan in s) || degerler.includes(s[alan]));
      return zincir;
    },
    is(alan, deger) {
      satirlar = satirlar.filter((s) => !(alan in s) || s[alan] === deger);
      return zincir;
    },
    or: () => zincir,
    order: () => zincir,
    limit: () => zincir,
    gte: () => zincir,
    update: () => zincir,
    insert: () => zincir,
    delete: () => zincir,
    maybeSingle: () => Promise.resolve({ data: satirlar[0] ?? null, error: null }),
    then(coz, reddet) {
      const sonuc = sayim
        ? { count: satirlar.length, error: null }
        : { data: satirlar, error: null };
      return Promise.resolve(sonuc).then(coz, reddet);
    },
  };
  return zincir;
}

let aktifKullanici = null;
export function girisYapmisOl(id) {
  aktifKullanici = id;
}

export const sahteSupabase = {
  from: sorgu,
  rpc: (ad) => Promise.resolve({ data: structuredClone(RPC[ad] ?? null), error: null }),
  auth: {
    getSession: () =>
      Promise.resolve({
        data: {
          session: aktifKullanici
            ? { user: { id: aktifKullanici, email: "test@ogr.x.edu.tr" } }
            : null,
        },
      }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: () => Promise.resolve({ error: null }),
  },
  channel: () => {
    const kanal = { on: () => kanal, subscribe: () => kanal };
    return kanal;
  },
  removeChannel: () => {},
};
