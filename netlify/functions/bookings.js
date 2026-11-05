import { json, readJSON } from "./store.js";

export default async () => {
  const bookings = await readJSON("bookings", []);
  return json(bookings);
};

export const config = { path: "/api/bookings" };
