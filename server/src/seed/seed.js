/**
 * Usage:
 *   npm run seed                 first-run content migrated from the original website (only fills EMPTY collections)
 *   npm run seed -- --demo       also adds clearly-labelled sample students/points/events so every screen has data
 *   npm run seed:reset           wipes all CMS content (NOT users / uploaded files) and re-seeds
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, serverRoot } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import * as M from '../models/index.js';
import * as D from './seedData.js';

const args = new Set(process.argv.slice(2));
const reset = args.has('--reset');
const demo = args.has('--demo');

const empty = async (Model) => (await Model.estimatedDocumentCount()) === 0;
const log = (...a) => console.log('  •', ...a);

async function copyLegacyUploads() {
  // Images that were uploaded through the old admin panel keep their exact URLs.
  const src = path.resolve(serverRoot, 'seed-assets', 'uploads');
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(env.uploadDir, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const dest = path.join(env.uploadDir, f);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(src, f), dest);
  }
}

async function ensureUser({ username, password, role, displayName }) {
  if (await M.User.exists({ username })) return null;
  const generated = !password;
  const plain = password || crypto.randomBytes(12).toString('base64url');
  await M.User.create({ username, displayName, role, passwordHash: await M.User.hashPassword(plain) });
  log(`created ${role} "${username}"${generated ? ` with generated password: ${plain}   (save it now, it is not shown again)` : ''}`);
  return plain;
}

async function main() {
  await connectDB();
  console.log('Seeding Gazva database...');

  if (reset) {
    for (const Model of [M.Category, M.Department, M.Wing, M.Club, M.ClassUnion, M.Student, M.Event, M.CoreMember, M.Advisor, M.Testimonial, M.Setting]) {
      await Model.deleteMany({});
    }
    log('cleared existing CMS content');
  }

  await copyLegacyUploads();

  await ensureUser({ username: env.seed.adminUsername, password: env.seed.adminPassword, role: 'admin', displayName: 'Administrator' });
  await ensureUser({ username: env.seed.viewerUsername, password: env.seed.viewerPassword, role: 'viewer', displayName: 'Rankings access' });

  if (await empty(M.Setting)) { await M.Setting.create(D.settings); log('site settings'); }

  if (await empty(M.Category)) {
    await M.Category.create([
      ...D.eventCategories.map((name, i) => ({ name, type: 'event', order: i + 1 })),
    ]);
    log('categories');
  }

  if (await empty(M.CoreMember)) { await M.CoreMember.create(D.core); log(`${D.core.length} core committee members`); }
  if (await empty(M.Advisor)) { await M.Advisor.create(D.advisors); log('advisory board'); }
  if (await empty(M.Testimonial)) { await M.Testimonial.create(D.testimonials); log('testimonials'); }
  if (await empty(M.Department)) { await M.Department.create(D.departments); log(`${D.departments.length} departments x ${D.DEPARTMENT_POSITIONS.length} members`); }
  if (await empty(M.ClassUnion)) { await M.ClassUnion.create(D.classUnions); log('8 class unions'); }

  if (await empty(M.Wing)) {
    let clubCount = 0;
    for (const [wi, w] of D.wings.entries()) {
      const members = w.roles.map((position, i) => ({ name: '', position, photo: '', order: i + 1, ...(D.wingPeopleOverrides[`${w.name}|${position}|${i}`] || {}) }));
      const wing = await M.Wing.create({ name: w.name, purpose: w.purpose, order: wi + 1, members, showLogoSlot: !!w.showLogoSlot });
      for (const [ci, clubName] of w.clubs.entries()) {
        await M.Club.create({
          name: clubName, wing: wing._id, order: ci + 1,
          members: D.clubRoles.map((position, i) => ({ name: '', position, photo: '', order: i + 1, ...(D.clubPeopleOverrides[`${clubName}|${position}`] || {}) })),
        });
        clubCount += 1;
      }
    }
    log(`${D.wings.length} wings, ${clubCount} clubs`);
  }

  if (await empty(M.Event)) {
    const cats = Object.fromEntries((await M.Category.find({ type: 'event' })).map((c) => [c.name, c._id]));
    const wingIds = Object.fromEntries((await M.Wing.find()).map((w) => [w.name, w._id]));
    await M.Event.create(D.legacyEvents.map(({ category, wing, ...e }) => ({ ...e, category: cats[category] || null, wing: wing ? wingIds[wing] : null })));
    log(`${D.legacyEvents.length} events`);
  }

  // Idempotent patch for databases created before the logo-slot rule: only Gazva Debate keeps its logo slot.
  const patched = await M.Wing.collection.updateOne({ name: 'Gazva Debate', showLogoSlot: { $exists: false } }, { $set: { showLogoSlot: true } });
  if (patched.modifiedCount) log('Gazva Debate keeps its logo slot (other wings hide the placeholder)');

  // The built-in blog was removed (the Blog button opens your external blog site). Drop its leftover categories.
  const gone = await M.Category.collection.deleteMany({ type: 'article' });
  if (gone.deletedCount) log(`removed ${gone.deletedCount} unused blog categories`);

  if (demo) await seedDemo();

  console.log('Done.');
  await disconnectDB();
}

async function seedDemo() {
  console.log('Adding demo data (sample names, safe to delete)...');
  if (await empty(M.Student)) {
    const classes = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];
    const names = ['Aysha Noora', 'Fathima Hiba', 'Safa Mariyam', 'Nihala Sherin', 'Rinsha Beegum', 'Hanan Jamal', 'Ameena Rafi', 'Sana Fidha', 'Zaina Basheer', 'Lubna Shamsu', 'Nadha Fathima', 'Shifana Rasheed'];
    const pts = [980, 940, 940, 910, 870, 860, 820, 790, 760, 700, 640, 610];
    await M.Student.create(names.map((name, i) => ({ name, className: classes[i % 4], department: i % 2 ? 'Quran and Related Science' : 'Fiqh and Usul al Fiqh', achievements: i < 3 ? 'Sample achievement' : '', points: pts[i], term: '2025-26' })));
    log('12 sample students (note the tie on 940 points)');
  }
  const bump = async (Model, base) => {
    const docs = await Model.find().sort({ order: 1 });
    await Promise.all(docs.map((d, i) => Model.updateOne({ _id: d._id }, { $set: { points: Math.max(0, base - i * 35 - (i % 3) * 5) } })));
  };
  await bump(M.Wing, 640); await bump(M.Club, 420); await bump(M.ClassUnion, 520);
  log('sample points on wings, clubs and class unions');

  const cat = await M.Category.findOne({ type: 'event', name: 'Cultural' });
  const wing = await M.Wing.findOne({ name: 'Organizing Committee' });
  const dept = await M.Department.findOne();
  const inDays = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  if (!(await M.Event.exists({ title: 'Sample: Union Day Celebration' }))) {
    await M.Event.create([
      { title: 'Sample: Union Day Celebration', date: inDays(12), startTime: '10:00', endTime: '15:30', venue: 'Main Auditorium', category: cat?._id, wing: wing?._id, featured: true, organizer: 'Organizing Committee', description: 'A sample upcoming event so the featured section has something to show. Edit or delete it from the admin panel.' },
      { title: 'Sample: Open Study Circle', date: inDays(3), startTime: '14:00', endTime: '16:00', venue: 'Seminar Hall', department: dept?._id, organizer: dept?.name || '', description: 'A sample department event.' },
    ]);
    log('2 sample upcoming events');
  }
}

main().catch(async (e) => {
  console.error('Seed failed:', e);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
