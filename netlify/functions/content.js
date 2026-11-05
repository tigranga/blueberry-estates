import { json, readJSON, writeJSON } from "./store.js";

export default async (req) => {
  if (req.method === "GET") {
    try {
      const listings = await readJSON("listings", null);
      const calendar = await readJSON("calendar", null);
      return json({ connected: true, listings, calendar });
    } catch (err) {
      return json({ connected: false, error: String(err), listings: null, calendar: null }, 500);
    }
  }

  if (req.method === "PUT") {
    const token = process.env.ADMIN_TOKEN;
    if (!token) return json({ error: "Set the ADMIN_TOKEN environment variable on Netlify, then enter that same host key here." }, 503);
    const auth = req.headers.get("Authorization") || "";
    if (auth !== `Bearer ${token}`) return json({ error: "Host key does not match ADMIN_TOKEN." }, 401);
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (Array.isArray(body.listings)) await writeJSON("listings", body.listings);
    if (body.calendar && typeof body.calendar === "object") await writeJSON("calendar", body.calendar);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/content" };
