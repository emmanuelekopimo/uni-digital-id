/**
 * Rebuilds docs/UniUyo-ID-Documentation.pdf.
 *   npm run build && npm run test:e2e && npm run docs:pdf
 * Uses the test database reseeded with UNIID_TODAY=2026-10-05 so screenshots are repeatable.
 */
import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Page } from "@playwright/test";
import { createPool, makeDb } from "../src/db";
import { resetDb, seed } from "../src/db/seed-data";
import { resolveNow } from "../src/lib/today";
import { baseCss, capture, figure, fontFace, printPdf, type Shot } from "./pdf-engine";

const require = createRequire(import.meta.url);
const TODAY = "2026-10-05";
const PORT = 3330;
const BASE = `http://localhost:${PORT}`;
const DB_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/uniid_test";
const ACCENT = "#10a37f";

async function reseed() {
  const pool = createPool(DB_URL);
  const d = makeDb(pool);
  await migrate(d, { migrationsFolder: "drizzle" });
  await resetDb(d);
  const r = await seed(d, resolveNow(TODAY));
  await pool.end();
  return r;
}

async function waitHealthy() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("server did not start");
}

function testCounts() {
  execSync("npx vitest run --reporter=json --outputFile=test-results/vitest.json", { stdio: "ignore" });
  const v = JSON.parse(readFileSync("test-results/vitest.json", "utf8"));
  const files = v.testResults as { name: string; assertionResults: { status: string }[] }[];
  const count = (dir: string) => files.filter((f) => f.name.includes(`/tests/${dir}/`)).reduce((s, f) => s + f.assertionResults.filter((a) => a.status === "passed").length, 0);
  let e2e = { passed: 0, total: 0, mobile: 0 };
  if (existsSync("test-results/e2e.json")) {
    const p = JSON.parse(readFileSync("test-results/e2e.json", "utf8"));
    e2e = { passed: p.stats.expected, total: p.stats.expected + p.stats.unexpected + p.stats.flaky, mobile: 0 };
    const walk = (s: { specs?: { tests: { projectName: string }[] }[]; suites?: unknown[] }): void => {
      for (const sp of s.specs ?? []) for (const t of sp.tests) if (t.projectName === "mobile") e2e.mobile++;
      for (const c of (s.suites ?? []) as (typeof s)[]) walk(c);
    };
    for (const s of p.suites) walk(s);
  }
  return { unit: count("unit"), integration: count("integration"), vitestFailed: v.numFailedTests as number, e2e };
}

const login = async (page: Page, as: string) => {
  await page.goto(`${BASE}/login`);
  await page.getByTestId(`demo-${as}`).click();
  await page.getByTestId("sign-in").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
};

const scanSamples = async (page: Page) => {
  await page.getByText("Sample: Uduak Etuk (Law)").click();
  await page.getByTestId("result").first().waitFor();
  await page.getByTestId("scan-input").fill("UU/23/CSC/045");
  await page.getByTestId("verify").click();
  await page.waitForFunction(() => document.querySelectorAll("[data-testid=result]").length >= 2);
};

async function main() {
  // Run the test suites first: integration tests reuse and change the test database.
  const counts = testCounts();
  const seeded = await reseed();
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    env: { ...process.env, DATABASE_URL: DB_URL, UNIID_TODAY: TODAY, SESSION_SECRET: "docs-secret-uniid-0123456789", NODE_ENV: "production" },
    stdio: "ignore",
  });
  try {
    await waitHealthy();
    const shots: Shot[] = [
      { key: "login", path: "/login", callouts: [
        { selector: "#email", text: "Email and password, prefilled with the lecturer demo account." },
        { selector: "[data-testid=sign-in]", text: "Continue checks the bcrypt hash and sets a signed JWT session cookie (HTTP-only)." },
        { selector: ".demo-list", text: "One click fills in the lecturer, a CSC 311 student, or a Law student for the 'not in this class' case." },
        { selector: ".login-photo .cap", text: "Real lecture theatre photo (Creative Commons)." },
      ] },
      { key: "card", path: "/card", as: "student", height: 1000, callouts: [
        { selector: "[data-testid=card-status]", text: "Card status from cardState(): valid, expiring within 30 days, expired or suspended." },
        { selector: ".idcard .photo", text: "ID photo: a locally generated portrait (DiceBear), never a real person's face." },
        { selector: "[data-testid=card-regno]", text: "Name, registration number, department and level come from the student register." },
        { selector: ".idcard .qr", text: "QR code with a signed verification link. It cannot be forged or edited without the server key." },
        { selector: ".table-wrap", text: "Courses this student is registered for, so they know which classes the scan will pass." },
      ] },
      { key: "scan", path: "/scan", as: "lecturer", callouts: [
        { selector: ".sidebar .sb-title + a", text: "Sidebar like a chat history: the lecturer's courses and recent scans, coloured by result." },
        { selector: ".hero h1", text: "The selected course is part of every check." },
        { selector: "[data-testid=scan-input]", text: "Paste the card code or type a registration number such as UU/23/CSC/045." },
        { selector: "[data-testid=camera-toggle]", text: "Camera scanner (jsQR reads frames from the phone or laptop camera) and Photo upload." },
        { selector: "[data-testid=samples]", text: "Sample cards from the seeded register for rehearsing with one device." },
      ] },
      { key: "results", path: "/scan", as: "lecturer", prepare: scanSamples, callouts: [
        { selector: ".bubble-user", text: "What was scanned, shown like a sent message." },
        { selector: "[data-testid=result][data-result=in_class] .result-head", text: "Green: genuine card and registered for CSC 311." },
        { selector: "[data-testid=result][data-result=other_department] .result-head", text: "Amber: a real UniUyo student, but from the Law department and not on this class list." },
        { selector: "[data-testid=result][data-result=other_department] .result-foot", text: "How it was checked (QR signature or reg. number) and whether the person is a confirmed UniUyo student." },
      ] },
      { key: "roster", path: "/scan", as: "lecturer", prepare: async (p) => { await p.getByRole("link", { name: /CSC 311/ }).first().click(); await p.getByTestId("enrolled-count").waitFor(); }, callouts: [
        { selector: ".stats", text: "Class size, students verified today, and flags (outsiders scanned today plus card problems)." },
        { selector: "[data-testid=roster-row] .pill.red", text: "A suspended student on the class list." },
        { selector: "[data-testid=roster-row] .pill.amber", text: "A card that expires within 30 days." },
        { selector: ".topline .btn", text: "Jump to the scanner with this course selected." },
      ] },
      { key: "public", path: "/card", as: "student", prepare: async (p) => { const u = await p.getByTestId("id-card").getAttribute("data-qr"); await p.goto(`${BASE}${new URL(u!).pathname}`); }, callouts: [
        { selector: "[data-testid=public-verdict]", text: "What any phone camera sees when it scans the card: a public page that only confirms the card is genuine and current." },
        { selector: "main img", text: "Only details already printed on the card are shown. Class registration needs a lecturer login." },
      ] },
      { key: "mcard", path: "/card", as: "student", mobile: true, callouts: [
        { selector: "[data-testid=open-sidebar]", text: "The sidebar slides in from this button on phones." },
        { selector: "[data-testid=id-card]", text: "The card scales with container query units so it stays the right shape at any width." },
      ] },
      { key: "mscan", path: "/scan", as: "lecturer", mobile: true, prepare: async (p) => { await p.getByText("Sample: Tobi Adebayo (suspended)").click(); await p.getByTestId("result").first().waitFor(); }, callouts: [
        { selector: ".composer", text: "Composer with course, camera and photo buttons." },
        { selector: "[data-testid=result]", text: "Red result: suspended student." },
      ] },
    ];
    const caps = await capture(BASE, shots, login, ".topline{position:static!important}@media (min-width: 861px){.sidebar{position:static!important}}");
    const f = (p: string) => require.resolve(p);
    const fonts = fontFace("Inter", f("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"));
    const css = baseCss({ bg: "#ffffff", ink: "#0d0d0d", muted: "#6b6b6b", line: "#e5e5e5", accent: ACCENT, head: '"Inter", sans-serif', body: '"Inter", sans-serif' });
    const fig = (k: string, cap: string) => figure(caps[k], cap, ACCENT);
    const e2eLine = counts.e2e.total ? `${counts.e2e.passed} of ${counts.e2e.total} passed (${counts.e2e.total - counts.e2e.mobile} desktop, ${counts.e2e.mobile} mobile)` : "run npm run test:e2e first";
    const logo = readFileSync("public/logo.svg", "utf8");

    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}${css}
.cover h1{font-size:38pt;margin-top:30mm;font-weight:600} .logo svg{width:64px;height:64px}
.verdicts td:first-child{font-weight:600;white-space:nowrap} .g{color:#0b7a5e} .a{color:#b45309} .r{color:#dc2626}
</style></head><body>
<section class="cover">
  <div>
    <div class="logo">${logo}</div>
    <h1>UniUyo ID</h1>
    <p style="font-size:15pt" class="muted">Digital student ID cards with QR verification</p>
    <p style="margin-top:12mm">The university already has a register of students with names and registration numbers. UniUyo ID turns each record into a digital ID card with a signed QR code. A lecturer scans the card and immediately sees whether the person is a UniUyo student, and whether they belong to the class being taught.</p>
    <div class="kpis"><div class="kpi"><b>${seeded.students}</b>students in the register</div><div class="kpi"><b>${seeded.courses}</b>courses, ${seeded.enrollments} registrations</div><div class="kpi"><b>${seeded.scans}</b>past scans</div></div>
    <h3>Contents</h3>
    <ol class="toc"><li>Overview</li><li>How the core logic works</li><li>Architecture and data model</li><li>Screen walkthrough</li><li>Mobile view</li><li>Running locally</li><li>Testing</li><li>Deployment</li><li>Five minute presentation script</li></ol>
  </div>
  <p class="muted">Demo logins: lecturer@uniuyo.edu.ng / lecturer123, student@uniuyo.edu.ng / student123, uduak.etuk@student.uniuyo.edu.ng / student123. Screens captured with the clock frozen at ${TODAY}.</p>
</section>

<section class="section"><h2>1. Overview</h2>
<table><tr><th>Who</th><th>What they do</th></tr>
<tr><td>Student</td><td>Logs in and sees their ID card (front and back) with photo, registration number, department, level, expiry and QR code, plus their registered courses. Can print the card.</td></tr>
<tr><td>Lecturer</td><td>Chooses one of their courses and scans a card with the camera, uploads a photo of the QR, or types a registration number. Sees a green, amber or red answer with the student's details. Sees the class list and who was verified today.</td></tr>
<tr><td>Anyone</td><td>Scanning the QR with a normal phone camera opens a public page that confirms the card is genuine and current, without showing course details.</td></tr></table>
<h3>The three questions a scan answers</h3>
<ol><li>Is this card genuine? (the QR signature is checked)</li><li>Is this a UniUyo student in good standing? (register, card version, suspension, expiry)</li><li>Does this student belong to this class? (course registration, then department)</li></ol>
<h3>Design</h3><p>The interface follows the visual style of ChatGPT: white canvas, a light grey sidebar with history, Inter type, a rounded composer box with tool buttons, and results shown like messages in a thread. It is a normal web app, not a chatbot.</p>
</section>

<section class="section"><h2>2. How the core logic works</h2>
<h3>Signed QR codes</h3>
<pre>QR text:  https://&lt;site&gt;/verify/UU1.&lt;base64url reg no&gt;.&lt;card version&gt;.&lt;signature&gt;
signature = first 16 bytes of HMAC-SHA256(server secret, "UU1.&lt;reg&gt;.&lt;version&gt;")</pre>
<p>Changing one character of the registration number or version breaks the signature, so a student cannot make a card for someone else. The signature is compared in constant time. When a card is reissued, <code>card_version</code> goes up and QR codes on the old card stop working.</p>
<h3>Verdict rules (src/lib/verify.ts)</h3>
<table class="verdicts"><tr><th>Check, in order</th><th>Result</th><th>Lecturer sees</th></tr>
<tr><td>Signature fails</td><td class="r">invalid</td><td>Not a UniUyo ID</td></tr>
<tr><td>Reg. number not in register</td><td class="r">unknown</td><td>Student not found</td></tr>
<tr><td>Card version is old</td><td class="r">revoked</td><td>Old card</td></tr>
<tr><td>Status suspended</td><td class="r">suspended</td><td>Student suspended</td></tr>
<tr><td>Expired or graduated</td><td class="a">expired</td><td>ID card expired</td></tr>
<tr><td>Registered for the course</td><td class="g">in_class</td><td>Belongs to CSC 311</td></tr>
<tr><td>Same department, not registered</td><td class="a">same_department</td><td>Not registered for CSC 311</td></tr>
<tr><td>Different department</td><td class="a">other_department</td><td>UniUyo student, not in this class</td></tr></table>
<p>Every check is saved in the <code>scans</code> table with the lecturer, course and result, so the class list can show who was verified today. Lecturers can only scan for, and see rosters of, courses they teach.</p>
<h3>Reading the QR</h3>
<p>The camera scanner uses <code>getUserMedia</code> and the jsQR library to read frames in the browser. The same decoder reads uploaded photos. Typed registration numbers are normalised (upper case, single slashes) and looked up directly; the result says "Looked up by registration number" because no card was presented.</p>
<h3>Dates</h3><p>Rules take "today" as an argument. <code>UNIID_TODAY=YYYY-MM-DD</code> freezes the clock for demos and tests. Cards expiring within 30 days show a warning.</p>
</section>

<section class="section"><h2>3. Architecture and data model</h2>
<div class="diagram"><div class="node"><b>Browser</b>Server-rendered pages. Client components: scanner (camera, jsQR), sidebar toggle, login demo buttons.</div><div class="node"><b>Next.js 16</b>Server Components, a Server Action for each scan, QR SVGs rendered on the server, proxy.ts route guard, /api/health.</div><div class="node"><b>PostgreSQL</b>Drizzle ORM, SQL migrations from drizzle-kit.</div></div>
<table><tr><th>Table</th><th>Columns</th><th>Rules</th></tr>
<tr><td>students</td><td>id, reg_no, first_name, last_name, other_name, gender, faculty, department, level, entry_year, status, id_issued_on, id_expires_on, card_version, blood_group</td><td>reg_no unique; the existing register</td></tr>
<tr><td>users</td><td>id, name, email, password_hash, role (student, lecturer), department, student_id</td><td>email unique; student_id links a login to a register entry</td></tr>
<tr><td>courses</td><td>id, code, title, department, level, units, venue, lecturer_id</td><td>code unique</td></tr>
<tr><td>enrollments</td><td>id, student_id, course_id</td><td>unique (student_id, course_id)</td></tr>
<tr><td>scans</td><td>id, lecturer_id, course_id, student_id, result, scanned_at</td><td>result is one of the eight verdicts</td></tr></table>
<table><tr><th>Route</th><th>Who</th><th>Purpose</th></tr>
<tr><td>/login</td><td>All</td><td>Log in, demo accounts</td></tr><tr><td>/card</td><td>Student</td><td>ID card, status and courses</td></tr>
<tr><td>/scan</td><td>Lecturer</td><td>Scanner and results thread</td></tr><tr><td>/courses/[id]</td><td>Lecturer</td><td>Class list with today's checks</td></tr>
<tr><td>/verify, /verify/[token]</td><td>Public</td><td>Card check for anyone</td></tr><tr><td>/api/health</td><td>Railway</td><td>Health check with database ping</td></tr></table>
</section>

<section class="section"><h2>4. Screen walkthrough</h2><h3>Log in</h3>${fig("login", "Log-in page.")}</section>
<section class="section"><h3>Student ID card</h3>${fig("card", "The demo student's card.")}</section>
<section class="section"><h3>Lecturer scanner</h3>${fig("scan", "Scanner before any scan.")}</section>
<section class="section"><h3>Scan results</h3>${fig("results", "A Law student, then a CSC 311 student, scanned for CSC 311. Newest on top.")}</section>
<section class="section"><h3>Class list</h3>${fig("roster", "CSC 311 class list.")}</section>
<section class="section"><h3>Public card check</h3>${fig("public", "Opened from the QR code with any phone camera.")}</section>
<section class="section"><h2>5. Mobile view</h2><p>All grids use <code>minmax(0, 1fr)</code>. The e2e mobile test fails if the page scrolls sideways.</p>${fig("mcard", "Student card on a phone.")}</section>
<section class="section">${fig("mscan", "Lecturer scanning on a phone.")}</section>

<section class="section"><h2>6. Running locally</h2>
<pre>service postgresql start
sudo -u postgres createdb uniid
sudo -u postgres createdb uniid_test
cp .env.example .env      # DATABASE_URL, SESSION_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev               # http://localhost:3000</pre>
<table><tr><th>Script</th><th>What it does</th></tr>
<tr><td>dev / build / start</td><td>Development server, production build, production server</td></tr>
<tr><td>start:prod</td><td>Migrate, seed only when empty, next start -H 0.0.0.0 (Railway)</td></tr>
<tr><td>db:generate, db:migrate, db:seed</td><td>New migration, apply, reset and seed</td></tr>
<tr><td>test:unit, test:integration, test:e2e</td><td>Test suites</td></tr><tr><td>docs:pdf</td><td>Rebuild this PDF</td></tr></table>
<p>The camera needs HTTPS or localhost. On the deployed site it works on phones and laptops.</p>
</section>

<section class="section"><h2>7. Testing</h2>
<div class="kpis"><div class="kpi"><b>${counts.unit}</b>unit tests passed</div><div class="kpi"><b>${counts.integration}</b>integration tests passed</div><div class="kpi"><b>${counts.e2e.passed}</b>e2e tests passed</div></div>
<table><tr><th>Suite</th><th>Covers</th></tr>
<tr><td>Unit</td><td>Token format, round trip, edited reg number, bumped version, wrong key, junk input, URL extraction; every verdict and their order; card states; reg number normalising; dates; sessions.</td></tr>
<tr><td>Integration (Postgres)</td><td>Seed size; in class; full URL input; Law student; same department; suspended, expired, old and new card versions; forged and unknown; typed reg number; lecturer cannot scan for other courses; course and scan scoping; roster counts; student record scoping; public lookup; scan log.</td></tr>
<tr><td>End to end (Playwright)</td><td>Login prefill; student card, QR link and public page; lecturer scans a class member, a Law student and a forged code; QR photo upload decoded in the browser; inline error and class list; students blocked from lecturer pages; mobile card and mobile scan.</td></tr></table>
<p>Latest run: unit ${counts.unit}, integration ${counts.integration}, ${counts.vitestFailed} failed; e2e ${e2eLine}.</p>
</section>

<section class="section"><h2>8. Deployment</h2>
<p>Runs on Railway in the <b>school-projects</b> project as the <b>uni-digital-id</b> service with its own <b>uni-digital-id-postgres</b> database, deployed from the main branch of the GitHub repository.</p>
<table><tr><th>Setting</th><th>Value</th></tr><tr><td>Build</td><td>npm run build</td></tr><tr><td>Start</td><td>npm run start:prod</td></tr>
<tr><td>Health check</td><td>/api/health (503 if Postgres is down)</td></tr><tr><td>DATABASE_URL</td><td>\${{uni-digital-id-postgres.DATABASE_URL}}</td></tr>
<tr><td>SESSION_SECRET</td><td>random value; also the key for QR signatures</td></tr><tr><td>NODE_ENV</td><td>production</td></tr></table>
</section>

<section class="section"><h2>9. Five minute presentation script</h2>
<table class="script"><tr><th>Time</th><th>What to do and say</th></tr>
<tr><td>0:00</td><td>Problem: lecturers cannot easily tell whether someone in class is a UniUyo student, or whether they belong to the course. Paper IDs are easy to fake. We use the existing student register and add a signed QR code.</td></tr>
<tr><td>0:30</td><td>On a phone, log in as the student (Ubong Akpan). Show the card: photo, name, reg number, department, expiry, QR, and the registered courses.</td></tr>
<tr><td>1:15</td><td>On the laptop, log in as the lecturer. Point out the sidebar: courses and recent scans. CSC 311 is selected.</td></tr>
<tr><td>1:40</td><td>Click Camera and scan the phone's card: green, Belongs to CSC 311, with the student's details.</td></tr>
<tr><td>2:20</td><td>Type the Law student's registration number UU/23/LAW/112: amber, UniUyo student, not in this class. This is the case the lecturer asked for.</td></tr>
<tr><td>2:50</td><td>Click the forged code sample: red, Not a UniUyo ID. Explain the HMAC signature in one sentence. Click the suspended sample: red.</td></tr>
<tr><td>3:30</td><td>Open CSC 311 in the sidebar: class list, verified today, flags for the suspended and expiring cards.</td></tr>
<tr><td>4:00</td><td>Scan the student's QR with the phone's normal camera app: the public page says Genuine UniUyo student ID.</td></tr>
<tr><td>4:20</td><td>Architecture and tests: Next.js Server Components and Actions, Drizzle with Postgres, pure verdict functions, test counts, Railway with health checks.</td></tr>
<tr><td>4:45</td><td>Next steps: attendance export per lecture, card reissue workflow at the ICT Centre. Questions.</td></tr></table>
</section>
<section style="page-break-before:always"><h3>Image credits</h3><p class="muted">Campus and lecture photos are Creative Commons images found through Openverse, stored in public/images with credits in public/images/credits.json. Student photos are generated portraits (DiceBear), not real people.</p></section>
</body></html>`;
    await printPdf(html, "docs/UniUyo-ID-Documentation.pdf", "UniUyo ID documentation");
    console.log("wrote docs/UniUyo-ID-Documentation.pdf");
  } finally {
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
