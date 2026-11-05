import { json, readJSON, writeJSON } from "./store.js";

export default async (req) => {
  if (req.method === "GET") {
    const dates = await readJSON("blocked-dates", []);
    return json(dates);
  }
  if (req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.dates)) return new Response("dates array required", { status: 400 });
    const current = new Set(await readJSON("blocked-dates", []));
    body.dates.forEach((date) => current.add(date));
    const dates = [...current].sort();
    await writeJSON("blocked-dates", dates);
    return json({ ok: true });
  }
  if (req.method === "DELETE") {
    const body = await req.json().catch(() => null);
    const dates = (await readJSON("blocked-dates", [])).filter((date) => date !== body?.date);
    await writeJSON("blocked-dates", dates);
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/blocked-dates" };
