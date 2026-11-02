# Gazva — MERN website & admin CMS

The existing Gazva website, upgraded into a production-ready **React + Vite / Node + Express / MongoDB + Mongoose** application.
The original design is the source of truth: `client/src/styles/style.css` **is your original stylesheet, unchanged**, and the Events,
Rankings and Contact page styles were lifted straight from the original HTML files. New styles (`additions.css`, `polish.css`) are built from the same
colour tokens, fonts, radii and shadows; the visual polish adds a geometric star pattern and floating diamonds taken from the logo's own motif.

```
gazva-mern/
├── client/                    React + Vite
│   └── src/
│       ├── styles/            style.css (original) · events.css · contact.css · rankings-original.css · additions.css
│       ├── components/        layout/ (Navbar, Footer) · ui/ · org/OrgExplorer (Wings + Departments) · events/
│       ├── pages/             Home, Core, Events, EventDetail, Rankings, Contact
│       ├── admin/             lazy-loaded CMS: ResourceManager (generic CRUD), forms, dashboard, users, media, settings
│       ├── context/           AuthContext        lib/ api layer, formatting, ranking, markdown
└── server/                    Express REST API
    └── src/  config · models · controllers · routes · middleware · validators (zod) · utils · seed
```

## Quick start

Requires Node 18.18+ and a MongoDB (local, Docker, or Atlas).

```bash
npm run install:all
cp server/.env.example server/.env      # then edit: MONGODB_URI, JWT_SECRET (32+ chars), ADMIN_/VIEWER_ passwords
npm run seed                            # migrates all original content; creates the admin + ranking-viewer accounts
npm run dev                             # API on :4000, site on http://localhost:5173
```

* `npm run seed:demo` additionally adds clearly-labelled **sample** students, points and events so every screen has data.
* If you leave `ADMIN_PASSWORD` / `VIEWER_PASSWORD` empty, the seed generates strong ones and prints them once.
* Admin panel: **/admin** (admins only). Protected rankings: sign in on the Rankings tabs (viewer or admin accounts).

**Upgrading an existing database** (created before per-wing logins / the logo-slot flag): just run `npm run seed` again — it only fills empty collections and applies the Gazva Debate logo-slot patch.

### Production

```bash
npm run build && npm start              # Express serves the API *and* the built React app on one port
# or:  docker compose up --build && docker compose exec app npm run seed
```
Set `NODE_ENV=production` (secure cookies, no stack traces) and put it behind HTTPS. **Uploaded images live on disk** (`UPLOAD_DIR`) — mount a persistent volume
there (the compose file does). Serve the site and API from the same origin; that keeps the httpOnly auth cookie simple and safe.

## What maps to what

| Requirement | Where |
|---|---|
| Departments reuse the Wings design (kept separate) | `components/org/OrgExplorer.jsx` renders both from the same markup/CSS; separate models, endpoints (`/api/departments`, `/api/wings`) and routes |
| 2 departments × 10 members, editable positions, logos | `models/Department.js` (hard limit of 10), seeded with the 10 example positions; admin → Departments |
| Wings stay a separate system (+ clubs as sub-units) | `models/Wing.js`, `Club.js`; the original Wings → sub-unit → leadership interaction is preserved |
| Events: poster, date, time, venue, category, status, featured, detail page, filters | `models/Event.js`, `pages/Events.jsx`, `EventDetail.jsx`. Status is **automatic** from date/time (IST by default) or **manual** override |
| Student ranking public + search | `GET /api/rankings/students` (no auth), `?q=` and `?className=` |
| Wing / Club / Class-Union rankings protected | `requireAuth` on those routes **on the server**; public wing/club endpoints never include `points` |
| Separate password per wing / club / class union | `controllers/credentials.js`, `requireRankingAccess` middleware, admin → Points & rankings → Login column |
| Wing logo placeholders removed (except Gazva Debate) | `Wing.showLogoSlot` flag (on for Gazva Debate only); toggle it per wing in Admin → Wings |
| 8 class unions | seeded as "Class Union 1…8" — rename them and add logos in admin |
| Auto ranking, tie handling | `server/src/utils/ranking.js` — higher points first, equal points share a rank ("1, 2, 2, 4"), shown as `T-2nd`; ties sorted alphabetically |
| Admin CMS | `/admin`: events, categories, departments, wings, clubs, core, advisors, testimonials, rankings (inline points), images, messages, site settings, users |

## The Blog button (your separate blog website)

This site has no blog pages of its own. The **Blog** button in the top menu (and the footer link) simply opens your other blog website in a new tab.

1. Sign in to **/admin** → **Settings**.
2. In the **Blog button** box, paste the full address of your blog, e.g. `https://blog.yourcollege.in` (it must start with `http://` or `https://`).
3. Click **Save settings**. The button appears straight away. Clear the box to hide the button.

## Accounts & security

* **Roles:** `admin` (everything), `viewer` (all three protected rankings — handy for staff) and **`member` — a separate login for each Wing, Club and Class Union**.
* **Per-entity logins:** in **Admin → Points & rankings**, open the Wings / Clubs / Class Unions tab. Every row has a **Login** column: *Set password* / *Manage* (change username or password, switch the login off, remove it), plus a **Generate logins** button that creates a unique username + random password for every entry that doesn't have one and lets you copy or download them as a CSV (shown once; stored hashed). A wing's login opens **only the Wing ranking**, a club's only the Club ranking, a class union's only the Class Union ranking; it never reaches the admin panel. Signed in, the entry sees a "Your wing is currently 3rd with 540 pts" banner and its own row highlighted. Deleting a wing/club/union removes its login; changing a password signs out that login's other sessions.
* Passwords hashed with **bcrypt (cost 12)**; admins need 12+ characters. Login is rate-limited (10 failures / 15 min) and timing-safe against username probing.
* **JWT in an httpOnly, SameSite=Lax, Secure (prod) cookie** — not readable by scripts. Every request re-checks the user in the database, so deactivating/demoting someone cuts access immediately; changing a password signs out all other sessions.
* Origin check on state-changing requests (CSRF defence in depth), Helmet CSP, CORS allow-list, request size limits, NoSQL-operator stripping, zod validation on every write.
* Uploads: JPG/PNG/WEBP/GIF/AVIF only, **file signature verified** (not the client's MIME type), random server-chosen filenames, SVG refused, 5 MB cap.

## API overview

Public: `GET /api/settings, /core, /advisors, /testimonials, /categories, /departments[/:slug], /wings[/:slug], /events[/:slug]` · `POST /api/contact`
Rankings: `GET /api/rankings/students` (public) · `/wings` `/clubs` `/class-unions` (signed-in)
Auth: `POST /api/auth/login | logout | change-password` · `GET /api/auth/me`
Admin (admin role): `/api/admin/<resource>` list/get/create/update/delete for `students wings clubs class-unions departments events categories core advisors testimonials`;
`POST /api/admin/<students|wings|clubs|class-unions>/:id/points` with `{set}` or `{add}`; plus `users`, `media`, `messages`, `settings`, `dashboard`.

## Tests

```bash
npm test      # 28 tests: ranking/tie logic, auth, role + per-entity access, point-leak checks, uploads, CRUD, event status…
```
Tests need a reachable MongoDB (`TEST_MONGODB_URI`, default `mongodb://127.0.0.1:27017/gazva_test`; the database is dropped afterwards).

## Notes about the conversion

* **Content preserved:** the 10 core members (incl. the uploaded photo), 7 wings with leadership slots, all 12 clubs/sub-units, the 5 events, advisory board and testimonial placeholders, hero/vision/mission/footer/contact text, and the three images previously uploaded through the old admin panel.
* **Not migrated:** the old SQLite admin login and its single test contact message; the two "Add student name" placeholder rows (they would have shown as unfinished entries in a public ranking).
* **Small fixes to the original:** the contact page referenced colour variables that were never defined (so its button/labels rendered unstyled) — they now map to the plum palette; the home hero wave colour now matches the section below it; "Departments" in the home statistics is now a live count (it said "1+" with two departments; switchable in Admin → Settings); the "Blog" button still opens your separate blog website (there is no blog inside this site) — its address is now set in the admin panel instead of being hard-coded.
* **Content you still need to supply:** department/club/wing logos (monogram placeholders show until uploaded), class-union names, department activities, member names/photos.
#   g a z v a - f z i w c  
 