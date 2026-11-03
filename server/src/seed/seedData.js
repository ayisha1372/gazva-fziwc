/**
 * Everything below is the content that lived in the original static / SQLite version of the
 * Gazva website (core.html, wings.html, department.html, gallery.html, index.html, footer ...),
 * moved into MongoDB so it can be edited from the admin panel.
 */

export const settings = {
  key: 'site',
  academicYear: '2025-26',
  hero: {
    badge: "Girls' Association of Zahra for Valuable Activities",
    title: 'Gazva',
    subtitle: "Students Union of Fathima Zahra Islamic Women's College — Nurturing Leadership, Culture & Academic Excellence",
  },
  stats: [
    { label: 'Students', value: 250, suffix: '+', source: 'manual' },
    { label: 'Events', value: 250, suffix: '+', source: 'manual' },
    { label: 'Sub Wings', value: 7, suffix: '+', source: 'manual' },
    { label: 'Departments', value: 0, suffix: '', source: 'departments' },
  ],
  blogUrl: '', // set in Admin -> Settings -> "Blog website link"
  vision:
    'To cultivate an empowered generation of women who excel academically, lead with integrity, and contribute meaningfully to society — rooted in Islamic values and equipped for the challenges of the modern world.',
  mission:
    'To foster holistic student development through inclusive programs, cultural initiatives, academic support, and leadership opportunities — creating a vibrant campus community where every student voice is heard and every talent celebrated.',
  footer: {
    sub: "Students Union of Fathima Zahra Islamic Women's College",
    address: "Fathima Zahra Islamic Women's College, Chemmad, Malappuram, Kerala - 676306\nRun by Darul Huda Islamic University, Chemmad.",
    email: 'gazvafathimazahra@gmail.com',
  },
  contact: {
    address: "Fathima Zahra Islamic Women's College\nTirur, Malappuram, Kerala — 676101",
    emails: ['gazva@fziwc.edu.in', 'media.gazva@fziwc.edu.in'],
    phone: '+91 00000 00000',
    hoursWeekday: 'Monday – Friday: 9:00 AM – 4:00 PM',
    hoursOther: 'Saturday: 9:00 AM – 1:00 PM · Sunday: Closed',
  },
  social: {
    instagram: 'https://www.instagram.com/gazvafathimazahra/',
    facebook: 'https://www.facebook.com/p/Fathima-Zahra-Islamic-Womens-College-Chemmad-Students-Union-GAZVA-100071198438474/',
    whatsapp: 'https://wa.me/919876543210',
    youtube: '',
  },
};

/* ---------------- Core committee (as stored in the old SQLite database) ---------------- */
export const core = [
  ['Zahra Mehthab', 'President'],
  ['Fathima Sana', 'Vice President'],
  ['Liya Shahma', 'General Secretary'],
  ['Fathwima Suhaila', 'Joint Secretary'],
  ['Asna NT', 'Programme Secretary'],
  ['Fathima Nafla', 'Finance Secretary'],
  ['Fathima Rifa PE', 'PRO'],
  ['Fidha Fathima AP', 'Media'],
  ['Ayisha E', 'Media', '/uploads/1789024027526-45f16f7cb1b6f288.png'],
  ['Hisana', 'Media'],
].map(([name, position, photo = ''], i) => ({ name, position, photo, order: i + 1 }));

/* ---------------- Advisory board (placeholders from index.html) ---------------- */
export const advisors = [
  'Principal', 'Vice Principal', 'Advisor', 'Advisor', 'Advisor', 'Advisor', 'Advisor', 'Advisor',
].map((role, i) => ({ name: 'Faculty Name', role, department: 'Department of —', photo: '', order: i + 1 }));

/* ---------------- "What Students Say" (index.html) ---------------- */
export const testimonials = [
  ['Gazva gave me the platform to discover my voice. The events and activities enriched my college life in ways I never imagined.', 'Student Name, Department of Fiqh'],
  ["Being part of the Media Wing helped me develop real-world skills. Gazva truly invests in every student's potential.", 'Student Name, Media Wing'],
  ['The Speakers\' Forum transformed my confidence. I went from being shy to presenting at inter-college competitions.', "Student Name, Speakers' Forum"],
  ["Gazva's leadership gave us all a sense of belonging. Every initiative is thoughtful, inclusive, and inspiring.", 'Student Name, Arabic Club'],
  ['12 years of service and still going strong. Gazva is the heartbeat of our college — a union that truly cares.', 'Alumni, Batch of 2022'],
].map(([quote, author], i) => ({ quote, author, rating: 5, order: i + 1 }));

/* ---------------- Categories ---------------- */
export const eventCategories = ['Debate', 'Cultural', 'Academic', 'Literary', 'Islamic', 'Media', 'Social'];

/* ---------------- Departments (2) — 10 member slots each ---------------- */
export const DEPARTMENT_POSITIONS = [
  'Department Head', 'Deputy Head', 'Secretary', 'Joint Secretary', 'Treasurer',
  'Media Coordinator', 'Programme Coordinator', 'Documentation Coordinator', 'Executive Member', 'Executive Member',
];

export const departments = [
  {
    name: 'Fiqh and Usul al Fiqh',
    tagline: 'Islamic jurisprudence and its principles',
    description: 'The department of Gazva for Fiqh and Usul al Fiqh — leading academic programmes, study circles and discussions on Islamic jurisprudence.',
  },
  {
    name: 'Quran and Related Science',
    tagline: 'Qur\u2019anic studies and the sciences around it',
    description: 'The department of Gazva for the Quran and Related Sciences — leading recitation, tafsir and Qur\u2019anic study programmes across campus.',
  },
].map((d, i) => ({
  ...d,
  order: i + 1,
  members: DEPARTMENT_POSITIONS.map((position, n) => ({ name: '', position, photo: '', order: n + 1 })),
  activities: [],
}));

/* ---------------- Wings (7) and their Clubs (sub-units) — from wings.html ---------------- */
const lead3 = ['Chairperson', 'Convener', 'Convener'];
const duo = ['General Secretary', 'Joint Secretary'];

export const wings = [
  { name: 'Organizing Committee', purpose: 'Coordinating and facilitating the major activities and initiatives of the union.', roles: lead3, clubs: [] },
  { name: 'Islamic Information Cell', purpose: 'Spreading authentic Islamic knowledge and awareness across campus.', roles: lead3, clubs: [] },
  { name: 'Prasanga Kala Vedi', purpose: 'Nurturing the art of public speaking and oratory among students.', roles: lead3, clubs: ["Speaker's Forum"] },
  { name: 'Media Wing', purpose: 'Capturing and communicating the story of Gazva across every platform.', roles: lead3, clubs: [] },
  { name: 'Editorial Board', purpose: "Shaping Gazva's publications and giving student voices a platform in print.", roles: lead3, clubs: [] },
  { name: 'Gazva Debate', showLogoSlot: true, purpose: 'Championing the art of argument through structured, competitive debate.', roles: ['Chairperson'], clubs: ['Nadi Munazara', 'Urdu Debate', 'British Parliamentary', 'Samvata Samiti'] },
  {
    name: 'SRDP',
    purpose: 'Driving student research and development across every discipline.',
    roles: lead3,
    clubs: ['English Club', 'Malayalam Club', 'Urdu Club', 'Arabic Club', 'Science and Maths Club', 'Translation Club', 'Art Club'],
  },
];

export const clubRoles = duo;

/** People / photos that had already been entered in the old admin panel. */
export const wingPeopleOverrides = {
  'Prasanga Kala Vedi|Chairperson|0': { photo: '/uploads/1789097588273-e7cb16898867f919.png' },
  'Editorial Board|Chairperson|0': { name: 'Ayisha Rifa' },
};
export const clubPeopleOverrides = {
  'Urdu Club|General Secretary': { photo: '/uploads/1789097574685-8afd2ac95df87235.png' },
};

/* ---------------- Class unions (8) ---------------- */
export const classUnions = Array.from({ length: 8 }, (_, i) => ({
  name: `Class Union ${i + 1}`,
  description: '',
  logo: '',
  points: 0,
  order: i + 1,
}));

/* ---------------- Events from gallery.html / SQLite ---------------- */
export const legacyEvents = [
  { title: 'Annual Munazarah 2026', category: 'Debate', organizer: 'Gazva Debates · Nadi Munazarah', dateLabel: 'March 2026', date: '2026-03-01', participants: '60+ participants',
    description: 'The flagship Arabic debate competition of Gazva, bringing together eloquent speakers from across the college to argue on contemporary Islamic issues in classical Arabic.' },
  { title: 'Gazva Cultural Night 2026', category: 'Cultural', organizer: 'Organizing Committee', wing: 'Organizing Committee', dateLabel: 'February 2026', date: '2026-02-01', participants: '200+ attendees',
    description: 'A dazzling evening of cultural performances, nasheeds, and creative expressions celebrating the diversity and talent of our students.' },
  { title: 'Urdu Poetry Evening', category: 'Literary', organizer: 'PKV · Urdu Club', dateLabel: 'January 2026', date: '2026-01-01', participants: '80+ attendees',
    description: 'An enchanting evening of Urdu poetry recitation, where students expressed profound emotions through classical and modern Urdu verse.' },
  { title: 'Islamic Information Week', category: 'Islamic', organizer: 'Islamic Information Cell', wing: 'Islamic Information Cell', dateLabel: 'December 2025', date: '2025-12-01', participants: '150+ attendees',
    description: 'A week-long series of talks, exhibitions, and discussions on Islamic history, science, and contemporary issues.' },
  { title: 'Research Symposium', category: 'Academic', organizer: 'PKV · SRDP', dateLabel: 'November 2025', date: '2025-11-01', participants: '45 presenters',
    description: 'Students from the SRDP presented their research papers on topics spanning Arabic linguistics, Islamic jurisprudence, and modern science before a distinguished panel.' },
];
