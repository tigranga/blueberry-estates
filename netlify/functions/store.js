import { getDatabase } from "@netlify/database";

const db = getDatabase();

export function database() {
  return db;
}

export async function readJSON(key, fallback = null) {
  const rows = await db.sql`SELECT value FROM site_state WHERE key = ${key}`;
  if (!rows.length || rows[0].value == null) return fallback;
  try {
    return JSON.parse(rows[0].value);
  } catch {
    return fallback;
  }
}

export async function writeJSON(key, value) {
  const encoded = JSON.stringify(value);
  await db.sql`
    INSERT INTO site_state (key, value, updated_at)
    VALUES (${key}, ${encoded}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

export function hostAuth(req, body) {
  const token = typeof Netlify !== "undefined" && Netlify.env ? Netlify.env.get("ADMIN_TOKEN") : process.env.ADMIN_TOKEN;
  if (!token) {
    return { ok: false, status: 503, error: "Set the ADMIN_TOKEN environment variable on Netlify, then enter that same host key here." };
  }
  const expected = String(token).trim();
  const header = req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  let provided = match ? match[1].trim() : "";
  if (!provided && body && typeof body.hostKey === "string") provided = body.hostKey.trim();
  if (!provided || provided !== expected) {
    return { ok: false, status: 401, error: "Host key does not match ADMIN_TOKEN." };
  }
  return { ok: true };
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
