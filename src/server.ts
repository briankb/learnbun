import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import index from "./index.html";

type ApiResponse = {
  message: string;
};

const port = Number(Bun.env.PORT ?? 3000);
const dataDirectory = join(process.cwd(), "data");
const databasePath = join(dataDirectory, "interest.sqlite");

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
