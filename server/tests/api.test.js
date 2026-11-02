import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/gazva_test';
process.env.UPLOAD_DIR = '/tmp/gazva-test-uploads';
process.env.CLIENT_URL = 'http://localhost:5173';

const { createApp } = await import('../src/app.js');
const { connectDB } = await import('../src/config/db.js');
const M = await import('../src/models/index.js');

let server;
let base;

/** tiny cookie-aware client */
function client() {
  let cookie = '';
  const call = async (method, path, body, headers = {}) => {
    const isForm = body instanceof FormData;
    const res = await fetch(base + path, {
      method,
      headers: { ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    let data = null;
    try { data = await res.json(); } catch { /* 204 */ }
    return { status: res.status, data, headers: res.headers };
  };
  return { get: (p, h) => call('GET', p, null, h), post: (p, b, h) => call('POST', p, b, h), put: (p, b) => call('PUT', p, b), del: (p) => call('DELETE', p) };
}

const ADMIN = { username: 'tadmin', password: 'Admin-password-12345' };
const VIEWER = { username: 'tviewer', password: 'Viewer-pass-123' };

before(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await M.User.create([
    { username: ADMIN.username, role: 'admin', passwordHash: await M.User.hashPassword(ADMIN.password) },
    { username: VIEWER.username, role: 'viewer', passwordHash: await M.User.hashPassword(VIEWER.password) },
  ]);
  await M.Wing.create([{ name: 'Wing A', points: 50 }, { name: 'Wing B', points: 80 }]);
  await M.ClassUnion.create([{ name: 'CU 1', points: 10 }]);
  await M.Student.create([
    { name: 'Amina', className: 'Y1', points: 90 }, { name: 'Bushra', className: 'Y2', points: 70 },
    { name: 'Camila', className: 'Y1', points: 70 }, { name: 'Dilna', className: 'Y3', points: 10 },
  ]);
  await M.Department.create({ name: 'Dept One' });
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

/* ------------------------------------------------------------------ public */
test('student ranking is PUBLIC, ranked by points with tie handling, and searchable', async () => {
  const c = client();
  const r = await c.get('/api/rankings/students');
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.items.map((s) => [s.name, s.rank, s.position]), [['Amina', 1, '1st'], ['Bushra', 2, 'T-2nd'], ['Camila', 2, 'T-2nd'], ['Dilna', 4, '4th']]);
  const s = await c.get('/api/rankings/students?q=cam');
  assert.equal(s.data.total, 1);
  assert.equal(s.data.items[0].rank, 2, 'search must not change a student\'s real rank');
  const f = await c.get('/api/rankings/students?className=Y1');
  assert.deepEqual(f.data.items.map((x) => x.name), ['Amina', 'Camila']);
});

/* ---------------------------------------------------- protected rankings */
for (const path of ['wings', 'clubs', 'class-unions']) {
  test(`/rankings/${path} requires authentication on the server`, async () => {
    const anon = client();
    assert.equal((await anon.get(`/api/rankings/${path}`)).status, 401);

    const viewer = client();
    assert.equal((await viewer.post('/api/auth/login', VIEWER)).status, 200);
    assert.equal((await viewer.get(`/api/rankings/${path}`)).status, 200);

    const admin = client();
    await admin.post('/api/auth/login', ADMIN);
    assert.equal((await admin.get(`/api/rankings/${path}`)).status, 200);
  });
}

test('wing ranking returns ranks, positions and points for signed-in users', async () => {
  const v = client();
  await v.post('/api/auth/login', VIEWER);
  const r = await v.get('/api/rankings/wings');
  assert.deepEqual(r.data.items.map((w) => [w.name, w.points, w.rank, w.position]), [['Wing B', 80, 1, '1st'], ['Wing A', 50, 2, '2nd']]);
});

test('public wing / department endpoints never leak ranking points', async () => {
  const c = client();
  const wings = await c.get('/api/wings');
  assert.equal(wings.status, 200);
  assert.ok(wings.data.length > 0);
  assert.ok(wings.data.every((w) => !('points' in w)), 'wing.points must not be public');
  const one = await c.get(`/api/wings/${wings.data[0].slug}`);
  assert.ok(!('points' in one.data));
  assert.ok(!JSON.stringify(wings.data).includes('"points"'));
});

/* ------------------------------------------------------------------- auth */
test('login: bad credentials -> 401, cookie is httpOnly, logout clears the session', async () => {
  const c = client();
  assert.equal((await c.post('/api/auth/login', { username: ADMIN.username, password: 'wrong' })).status, 401);
  assert.equal((await c.post('/api/auth/login', { username: 'nobody', password: 'x' })).status, 401);
  const ok = await c.post('/api/auth/login', ADMIN);
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(ok.headers.get('set-cookie'), /SameSite=Lax/i);
  assert.equal(ok.data.user.role, 'admin');
  assert.ok(!JSON.stringify(ok.data).includes('passwordHash'));
  assert.equal((await c.get('/api/auth/me')).status, 200);
  await c.post('/api/auth/logout');
  assert.equal((await c.get('/api/auth/me')).data.user, null);
});

test('passwords are stored as bcrypt hashes', async () => {
  const u = await M.User.findOne({ username: ADMIN.username }).select('+passwordHash');
  assert.match(u.passwordHash, /^\$2[aby]\$12\$/);
});

/* ------------------------------------------------------------ authorization */
test('admin API: anonymous -> 401, viewer -> 403, admin -> 200', async () => {
  assert.equal((await client().get('/api/admin/dashboard')).status, 401);
  const v = client(); await v.post('/api/auth/login', VIEWER);
  assert.equal((await v.get('/api/admin/dashboard')).status, 403);
  assert.equal((await v.get('/api/admin/students')).status, 403);
  assert.equal((await v.post('/api/admin/students', { name: 'x' })).status, 403);
  const a = client(); await a.post('/api/auth/login', ADMIN);
  assert.equal((await a.get('/api/admin/dashboard')).status, 200);
});

test('cross-site writes are rejected by the Origin guard', async () => {
  const a = client(); await a.post('/api/auth/login', ADMIN);
  const r = await a.post('/api/admin/students', { name: 'Evil' }, { Origin: 'https://evil.example' });
  assert.equal(r.status, 403);
});

test('a demoted / deactivated user loses access immediately', async () => {
  const a = client(); await a.post('/api/auth/login', ADMIN);
  const made = await a.post('/api/admin/users', { username: 'temp.viewer', password: 'Temp-viewer-1', role: 'viewer' });
  assert.equal(made.status, 201);
  const t = client(); await t.post('/api/auth/login', { username: 'temp.viewer', password: 'Temp-viewer-1' });
  assert.equal((await t.get('/api/rankings/wings')).status, 200);
  await a.put(`/api/admin/users/${made.data.id}`, { active: false });
  assert.equal((await t.get('/api/rankings/wings')).status, 401);
});

test('admin cannot delete or demote themselves', async () => {
  const a = client(); const login = await a.post('/api/auth/login', ADMIN);
  assert.equal((await a.del(`/api/admin/users/${login.data.user.id}`)).status, 400);
  assert.equal((await a.put(`/api/admin/users/${login.data.user.id}`, { role: 'viewer' })).status, 400);
});

/* -------------------------------------------------------------------- CMS */
test('departments: at most 10 members, positions editable', async () => {
  const a = client(); await a.post('/api/auth/login', ADMIN);
  const members = (n) => Array.from({ length: n }, (_, i) => ({ name: `M${i}`, position: i === 0 ? 'Department Head' : 'Executive Member' }));
  const tooMany = await a.post('/api/admin/departments', { name: 'Too Many', members: members(11) });
  assert.equal(tooMany.status, 400);
  const ok = await a.post('/api/admin/departments', { name: 'Dept Two', logo: '', members: members(10) });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.members.length, 10);
  const edited = await a.put(`/api/admin/departments/${ok.data.id}`, { name: 'Dept Two', members: [{ name: 'Z', position: 'Secretary' }] });
  assert.equal(edited.data.members[0].position, 'Secretary');
  const pub = await client().get(`/api/departments/${ok.data.slug}`);
  assert.equal(pub.status, 200);
  assert.ok(!('points' in pub.data));
});

test('events: auto status from date/time, manual override, filtering', async () => {
  const a = client(); await a.post('/api/auth/login', ADMIN);
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const up = await a.post('/api/admin/events', { title: 'Future Fest', date: day(10), startTime: '10:00', venue: 'Hall' });
  const past = await a.post('/api/admin/events', { title: 'Old Fest', date: day(-10) });
  const manual = await a.post('/api/admin/events', { title: 'Pinned Live', date: day(30), statusMode: 'manual', status: 'ongoing' });
  assert.equal(up.status, 201);
  const all = await client().get('/api/events');
  const by = Object.fromEntries(all.data.items.map((e) => [e.title, e.status]));
  assert.equal(by['Future Fest'], 'upcoming');
  assert.equal(by['Old Fest'], 'completed');
  assert.equal(by['Pinned Live'], 'ongoing');
  assert.equal(all.data.spotlight.title, 'Pinned Live');
  assert.equal((await client().get('/api/events?status=completed')).data.items.length, 1);
  assert.equal((await a.post('/api/admin/events', { title: 'Bad', date: day(5), endDate: day(1) })).status, 400);
  assert.equal((await a.post('/api/admin/events', { title: 'Bad2', date: '10/05/2026' })).status, 400);
  assert.equal((await client().get(`/api/events/${up.data.slug}`)).status, 200);
});

test('points: set / add are applied and re-rank automatically', async () => {
  const a = client(); await a.post('/api/auth/login', ADMIN);
  const list = await a.get('/api/admin/wings');
  const wingA = list.data.items.find((w) => w.name === 'Wing A');
  const bump = await a.post(`/api/admin/wings/${wingA.id}/points`, { add: 100 });
  assert.equal(bump.data.points, 150);
  const v = client(); await v.post('/api/auth/login', VIEWER);
  const r = await v.get('/api/rankings/wings');
  assert.equal(r.data.items[0].name, 'Wing A');
  assert.equal((await a.post(`/api/admin/wings/${wingA.id}/points`, { add: -9999 })).data.points, 0, 'points never go below zero');
  assert.equal((await a.post(`/api/admin/wings/${wingA.id}/points`, { set: 5, add: 1 })).status, 400);
});

test('uploads: real images accepted, disguised files rejected, admin only', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');
  const form = (buf, name, type) => { const f = new FormData(); f.append('image', new Blob([buf], { type }), name); return f; };
  assert.equal((await client().post('/api/admin/media', form(png, 'a.png', 'image/png'))).status, 401);
  const a = client(); await a.post('/api/auth/login', ADMIN);
  const ok = await a.post('/api/admin/media', form(png, 'logo.png', 'image/png'));
  assert.equal(ok.status, 201);
  assert.match(ok.data.url, /^\/uploads\/[\w.-]+\.png$/);
  assert.equal((await fetch(base + ok.data.url)).status, 200);
  const fake = await a.post('/api/admin/media', form(Buffer.from('<script>alert(1)</script>'), 'x.png', 'image/png'));
  assert.equal(fake.status, 400);
  const svg = await a.post('/api/admin/media', form(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'x.svg', 'image/svg+xml'));
  assert.equal(svg.status, 400);
  assert.equal((await a.del(`/api/admin/media/${ok.data.id}`)).status, 204);
  assert.equal((await fetch(base + ok.data.url)).status, 404);
});

test('contact form: validates, stores, and the honeypot silently drops bots', async () => {
  const c = client();
  assert.equal((await c.post('/api/contact', { firstName: 'A', email: 'nope', message: 'hello there' })).status, 400);
  assert.equal((await c.post('/api/contact', { firstName: 'Aisha', email: 'a@b.co', message: 'Salaam, a question' })).status, 201);
  assert.equal((await c.post('/api/contact', { firstName: 'Bot', email: 'b@b.co', message: 'buy now!!', website: 'http://spam' })).status, 201);
  assert.equal(await M.Message.countDocuments(), 1);
});

test('NoSQL operator injection in query strings and bodies is neutralised', async () => {
  const c = client();
  const r = await c.get('/api/rankings/students?className[$ne]=zzz&q[$regex]=.*');
  assert.equal(r.status, 200);
  const login = await c.post('/api/auth/login', { username: { $ne: '' }, password: { $ne: '' } });
  assert.equal(login.status, 400);
});

test('unknown API route -> JSON 404', async () => {
  const r = await client().get('/api/nope');
  assert.equal(r.status, 404);
  assert.ok(r.data.error);
});

/* ------------------------------------------------ per-entity ranking logins */
test('each wing / club / class union can have its OWN login, scoped to its own ranking', async () => {
  const a = client(); await a.post('/api/auth/login', ADMIN);
  const wings = (await a.get('/api/admin/wings')).data.items;
  const wingB = wings.find((w) => w.name === 'Wing B');
  const club = (await a.post('/api/admin/clubs', { name: 'Test Club', wing: wingB.id })).data;
  const cu = (await a.get('/api/admin/class-unions')).data.items[0];

  // needs a password to create
  assert.equal((await a.put(`/api/admin/credentials/wings/${wingB.id}`, { username: 'wing.b' })).status, 400);
  // too-short password rejected
  assert.equal((await a.put(`/api/admin/credentials/wings/${wingB.id}`, { username: 'wing.b', password: 'short' })).status, 400);
  const made = await a.put(`/api/admin/credentials/wings/${wingB.id}`, { username: 'wing.b', password: 'Wing-B-pass-1' });
  assert.equal(made.status, 200);
  assert.ok(!JSON.stringify(made.data).includes('assword'), 'no password material in the response');
  await a.put(`/api/admin/credentials/clubs/${club.id}`, { username: 'club.test', password: 'Club-test-pass-1' });
  await a.put(`/api/admin/credentials/class-unions/${cu.id}`, { username: 'cu.one', password: 'Union-one-pass-1' });

  // wing login: opens the wing ranking only
  const w = client();
  const login = await w.post('/api/auth/login', { username: 'wing.b', password: 'Wing-B-pass-1' });
  assert.equal(login.data.user.role, 'member');
  assert.equal(login.data.user.scope.type, 'wing');
  assert.equal(login.data.user.scope.name, 'Wing B');
  assert.equal((await w.get('/api/rankings/wings')).status, 200);
  assert.equal((await w.get('/api/rankings/clubs')).status, 403);
  assert.equal((await w.get('/api/rankings/class-unions')).status, 403);
  assert.equal((await w.get('/api/admin/dashboard')).status, 403, 'a member login never reaches the admin API');

  // club + class-union logins are each limited to their own category
  const c = client(); await c.post('/api/auth/login', { username: 'club.test', password: 'Club-test-pass-1' });
  assert.equal((await c.get('/api/rankings/clubs')).status, 200);
  assert.equal((await c.get('/api/rankings/wings')).status, 403);
  const u = client(); await u.post('/api/auth/login', { username: 'cu.one', password: 'Union-one-pass-1' });
  assert.equal((await u.get('/api/rankings/class-unions')).status, 200);
  assert.equal((await u.get('/api/rankings/clubs')).status, 403);

  // list shows who has a login, never a password
  const list = await a.get('/api/admin/credentials/wings');
  assert.ok(list.data.items.some((i) => i.username === 'wing.b'));
  assert.ok(!JSON.stringify(list.data).includes('Wing-B-pass-1'));

  // passwords are changed per entity; the old one stops working, other sessions are signed out
  await a.put(`/api/admin/credentials/wings/${wingB.id}`, { password: 'Wing-B-new-pass-2' });
  assert.equal((await w.get('/api/rankings/wings')).status, 401);
  assert.equal((await client().post('/api/auth/login', { username: 'wing.b', password: 'Wing-B-pass-1' })).status, 401);
  assert.equal((await client().post('/api/auth/login', { username: 'wing.b', password: 'Wing-B-new-pass-2' })).status, 200);

  // switching a login off locks it out immediately
  const w2 = client(); await w2.post('/api/auth/login', { username: 'wing.b', password: 'Wing-B-new-pass-2' });
  await a.put(`/api/admin/credentials/wings/${wingB.id}`, { active: false });
  assert.equal((await w2.get('/api/rankings/wings')).status, 401);

  // deleting the club removes its login too
  await a.del(`/api/admin/clubs/${club.id}`);
  assert.equal((await client().post('/api/auth/login', { username: 'club.test', password: 'Club-test-pass-1' })).status, 401);
});

test('bulk generate creates one unique login per wing and returns passwords exactly once', async () => {
  const a = client(); await a.post('/api/auth/login', ADMIN);
  await M.Wing.create({ name: 'Fresh Wing' });
  const gen = await a.post('/api/admin/credentials/wings/generate', { onlyMissing: true });
  assert.equal(gen.status, 200);
  const fresh = gen.data.items.find((i) => i.name === 'Fresh Wing');
  assert.ok(fresh && fresh.password.length >= 10 && /^wing\./.test(fresh.username));
  assert.ok(!gen.data.items.some((i) => i.name === 'Wing B'), 'wings that already have a login are skipped');
  assert.equal((await client().post('/api/auth/login', { username: fresh.username, password: fresh.password })).status, 200);
  const again = await a.post('/api/admin/credentials/wings/generate', { onlyMissing: true });
  assert.equal(again.data.items.some((i) => i.name === 'Fresh Wing'), false, 'second run does not reset existing logins');
  const usernames = (await M.User.find({ role: 'member' })).map((u) => u.username);
  assert.equal(new Set(usernames).size, usernames.length);
  const stored = await M.User.findOne({ username: fresh.username }).select('+passwordHash');
  assert.notEqual(stored.passwordHash, fresh.password);
});

test('general viewer accounts still open every protected ranking', async () => {
  const v = client(); await v.post('/api/auth/login', VIEWER);
  for (const p of ['wings', 'clubs', 'class-unions']) assert.equal((await v.get(`/api/rankings/${p}`)).status, 200);
});

test('wing logo slot flag is saved and exposed publicly', async () => {
  const a = client(); await a.post('/api/auth/login', ADMIN);
  const made = await a.post('/api/admin/wings', { name: 'Slot Wing', showLogoSlot: true });
  assert.equal(made.data.showLogoSlot, true);
  const pub = (await client().get('/api/wings')).data;
  assert.equal(pub.find((w) => w.name === 'Slot Wing').showLogoSlot, true);
  assert.equal(pub.find((w) => w.name === 'Wing A').showLogoSlot, false);
});

test('wing ranking reports showLogoSlot as a strict boolean (even for older records)', async () => {
  await M.Wing.collection.insertOne({ name: 'Legacy Wing', slug: 'legacy-wing', points: 1, published: true, members: [], activities: [] });
  const v = client(); await v.post('/api/auth/login', VIEWER);
  const item = (await v.get('/api/rankings/wings')).data.items.find((w) => w.name === 'Legacy Wing');
  assert.strictEqual(item.showLogoSlot, false);
});

test('blog button link: admin-set, http(s) only, public, and no built-in blog routes remain', async () => {
  const a = client(); await a.post('/api/auth/login', ADMIN);
  const cur = (await a.get('/api/admin/settings')).data;
  const body = (blogUrl) => ({ academicYear: cur.academicYear || '', hero: cur.hero || { badge: '', title: '', subtitle: '' }, stats: [], vision: '', mission: '',
    footer: { sub: '', description: '', address: '', email: '' }, contact: { address: '', emails: [], phone: '', hoursWeekday: '', hoursOther: '' },
    social: { instagram: '', facebook: '', whatsapp: '', youtube: '' }, blogUrl });
  assert.equal((await a.put('/api/admin/settings', body('javascript:alert(1)'))).status, 400);
  assert.equal((await a.put('/api/admin/settings', body('ftp://x.example'))).status, 400);
  assert.equal((await a.put('/api/admin/settings', body('https://blog.example.org'))).status, 200);
  assert.equal((await client().get('/api/settings')).data.blogUrl, 'https://blog.example.org');
  assert.equal((await a.put('/api/admin/settings', body(''))).status, 200);
  assert.equal((await client().get('/api/settings')).data.blogUrl, '');
  assert.equal((await client().get('/api/articles')).status, 404);
  assert.equal((await a.get('/api/admin/articles')).status, 404);
});

test('testimonials carry a photo for the avatar, validated like every other image field', async () => {
  const a = client(); await a.post('/api/auth/login', ADMIN);
  const ok = await a.post('/api/admin/testimonials', { quote: 'Lovely union.', author: 'Aisha K, Fiqh Department', photo: '/uploads/abc-123.png', rating: 5 });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.photo, '/uploads/abc-123.png');
  assert.equal((await a.post('/api/admin/testimonials', { quote: 'x', photo: 'javascript:alert(1)' })).status, 400);
  assert.equal((await client().get('/api/testimonials')).data.some((t) => t.photo === '/uploads/abc-123.png'), true);
});
