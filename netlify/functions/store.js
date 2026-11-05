import { getStore } from "@netlify/blobs";

export function store() {
  return getStore("site-state");
}

export async function readJSON(key, fallback = null) {
  const value = await store().get(key, { type: "json" });
  return value == null ? fallback : value;
}

export async function writeJSON(key, value) {
  await store().setJSON(key, value);
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
