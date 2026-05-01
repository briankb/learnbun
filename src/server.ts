import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { Database } from "bun:sqlite";
import index from "./index.html";

type ApiResponse = {
  message: string;
};

type SignupRow = {
  id: number;
  email: string;
  created_at: string;
};

const port = Number(Bun.env.PORT ?? 3000);
const dataDirectory = join(process.cwd(), "data");
const databasePath = join(dataDirectory, "interest.sqlite");
const adminUsername = Bun.env.ADMIN_USERNAME;
const adminPassword = Bun.env.ADMIN_PASSWORD;
const adminCookieName = "learnbun_admin";
const activeSessions = new Set<string>();

if (!adminUsername || !adminPassword) {
  throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set.");
}

mkdirSync(dataDirectory, { recursive: true });

const db = new Database(databasePath, { create: true, strict: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS waitlist_signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const insertSignup = db.query<
  never,
  [string]
>("INSERT INTO waitlist_signups (email) VALUES (?1)");
const listSignups = db.query<SignupRow, []>(
  "SELECT id, email, created_at FROM waitlist_signups ORDER BY created_at DESC, id DESC"
);

function json(body: ApiResponse, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseCookies(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  const cookies = new Map<string, string>();
  for (const pair of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = pair.trim().split("=");
    if (!rawName) {
      continue;
    }

    cookies.set(rawName, decodeURIComponent(rawValue.join("=")));
  }

  return cookies;
}

function isAdminAuthenticated(request: Request) {
  const token = parseCookies(request).get(adminCookieName);
  return token ? activeSessions.has(token) : false;
}

function createAdminSession() {
  const token = randomBytes(24).toString("base64url");
  activeSessions.add(token);
  return token;
}

function clearAdminSession(request: Request) {
  const token = parseCookies(request).get(adminCookieName);
  if (token) {
    activeSessions.delete(token);
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function renderAdminPage(signups: SignupRow[]) {
  const rows = signups.length
    ? signups.map((signup) => `
        <tr>
          <td>${escapeHtml(signup.email)}</td>
          <td>${escapeHtml(signup.created_at)}</td>
        </tr>
      `).join("")
    : `
      <tr>
        <td colspan="2">No signups yet.</td>
      </tr>
    `;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Learn Bun Admin</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7ecd9;
        --panel: rgba(255, 251, 244, 0.88);
        --ink: #111111;
        --muted: rgba(17, 17, 17, 0.66);
        --line: rgba(17, 17, 17, 0.12);
        --accent: #ff9d00;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Avenir Next", Avenir, "Segoe UI", sans-serif;
        background: linear-gradient(180deg, #fbf3e5 0%, #ecd4ad 100%);
        color: var(--ink);
      }
      .wrap {
        width: min(1080px, calc(100% - 1.5rem));
        margin: 0 auto;
        padding: 2rem 0 3rem;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 1.5rem;
        box-shadow: 0 18px 60px rgba(62, 33, 2, 0.12);
        backdrop-filter: blur(14px);
      }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
        padding: 1.5rem;
      }
      h1 {
        margin: 0 0 0.3rem;
        font-size: clamp(2rem, 5vw, 3rem);
        letter-spacing: -0.05em;
      }
      p {
        margin: 0;
        color: var(--muted);
      }
      .actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.8rem;
        padding: 0.8rem 1rem;
        border-radius: 0.9rem;
        border: 1px solid var(--line);
        background: white;
        color: var(--ink);
        text-decoration: none;
        font-weight: 700;
      }
      .button.primary {
        border: 0;
        background: linear-gradient(180deg, #ffb847 0%, #ff9800 100%);
      }
      form { margin: 0; }
      .table-wrap {
        overflow-x: auto;
        border-top: 1px solid var(--line);
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        text-align: left;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--line);
      }
      th {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      @media (max-width: 720px) {
        .header {
          flex-direction: column;
          align-items: start;
        }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="panel">
        <div class="header">
          <div>
            <h1>Admin</h1>
            <p>${signups.length} waitlist signup${signups.length === 1 ? "" : "s"}</p>
          </div>
          <div class="actions">
            <a class="button primary" href="/admin/download">Download SQLite</a>
            <form method="post" action="/admin/logout">
              <button class="button" type="submit">Log out</button>
            </form>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function renderAdminLogin(errorMessage?: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Learn Bun Admin Login</title>
    <style>
      :root {
        --ink: #111111;
        --muted: rgba(17, 17, 17, 0.66);
        --line: rgba(17, 17, 17, 0.1);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1rem;
        font-family: "Avenir Next", Avenir, "Segoe UI", sans-serif;
        color: var(--ink);
        background: linear-gradient(180deg, #fbf3e5 0%, #ecd4ad 100%);
      }
      .card {
        width: min(100%, 28rem);
        padding: 1.5rem;
        border-radius: 1.5rem;
        background: rgba(255, 251, 244, 0.88);
        border: 1px solid var(--line);
        box-shadow: 0 18px 60px rgba(62, 33, 2, 0.12);
      }
      h1 {
        margin: 0 0 0.4rem;
        font-size: 2rem;
        letter-spacing: -0.05em;
      }
      p {
        margin: 0 0 1.2rem;
        color: var(--muted);
      }
      label {
        display: block;
        margin-bottom: 0.35rem;
        font-size: 0.92rem;
      }
      input {
        width: 100%;
        min-height: 3rem;
        padding: 0.8rem 0.9rem;
        border-radius: 0.9rem;
        border: 1px solid var(--line);
        margin-bottom: 1rem;
        font: inherit;
      }
      button {
        width: 100%;
        min-height: 3rem;
        border: 0;
        border-radius: 0.9rem;
        background: linear-gradient(180deg, #ffb847 0%, #ff9800 100%);
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      .error {
        margin-bottom: 1rem;
        color: #b91c1c;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Admin login</h1>
      <p>Sign in to view waitlist signups and download the database.</p>
      ${errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : ""}
      <form method="post" action="/admin/login">
        <label for="username">Username</label>
        <input id="username" name="username" autocomplete="username" required />
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />
        <button type="submit">Sign in</button>
      </form>
    </main>
  </body>
</html>`;
}

function saveInterest(email: string) {
  try {
    insertSignup.run(email.toLowerCase());
    return { ok: true as const };
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return {
        ok: false as const,
        status: 409,
        message: "That email is already on the waitlist."
      };
    }

    console.error("Failed to insert waitlist signup", error);
    return {
      ok: false as const,
      status: 500,
      message: "The waitlist is unavailable right now."
    };
  }
}

const server = Bun.serve({
  port,
  idleTimeout: 30,
  routes: {
    "/": index,
    "/health": () => new Response("ok"),
    "/admin": (request) => {
      if (!isAdminAuthenticated(request)) {
        return new Response(renderAdminLogin(), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store"
          }
        });
      }

      const signups = listSignups.all();
      return new Response(renderAdminPage(signups), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    },
    "/admin/login": async (request) => {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      const form = await request.formData();
      const username = String(form.get("username") ?? "");
      const password = String(form.get("password") ?? "");

      if (!safeEqual(username, adminUsername) || !safeEqual(password, adminPassword)) {
        return new Response(renderAdminLogin("Invalid username or password."), {
          status: 401,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store"
          }
        });
      }

      const token = createAdminSession();
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/admin",
          "Set-Cookie": `${adminCookieName}=${token}; HttpOnly; Path=/; SameSite=Lax`
        }
      });
    },
    "/admin/logout": (request) => {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      clearAdminSession(request);
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/admin",
          "Set-Cookie": `${adminCookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
        }
      });
    },
    "/admin/download": (request) => {
      if (!isAdminAuthenticated(request)) {
        return new Response("Unauthorized", { status: 401 });
      }

      return new Response(Bun.file(databasePath), {
        headers: {
          "Content-Type": "application/x-sqlite3",
          "Content-Disposition": 'attachment; filename="interest.sqlite"',
          "Cache-Control": "no-store"
        }
      });
    },
    "/api/interest": async (request) => {
      if (request.method !== "POST") {
        return json({ message: "Method not allowed." }, 405);
      }

      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return json({ message: "Invalid JSON body." }, 400);
      }

      const email = typeof payload === "object" && payload !== null ? String((payload as { email?: unknown }).email ?? "").trim() : "";

      if (!email || !validateEmail(email)) {
        return json({ message: "Enter a valid email address." }, 400);
      }

      const result = saveInterest(email);
      if (!result.ok) {
        return json({ message: result.message }, result.status);
      }

      return json({ message: "You’re on the list. We’ll reach out when Learn Bun launches." }, 201);
    }
  },
  fetch() {
    return new Response("Not found", { status: 404 });
  },
  error(error) {
    console.error("Unhandled server error", error);
    return json({ message: "Internal server error." }, 500);
  }
});

console.log(`Learn Bun is running on ${server.url}`);
