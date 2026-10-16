import type { Movie } from "./game-data";
import { moviesForEra, type Era } from "./game-logic";

// Server only: import this from route handlers, never from a client component.
// The daily order is keyed by DAILY_SECRET, so even with the full catalogue in
// the browser bundle nobody can work out the answer without asking the server.

const FALLBACK_SECRET = "chitram-local-development";
let warnedAboutSecret = false;

function dailySecret() {
  const secret = process.env.DAILY_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production" && !warnedAboutSecret) {
    warnedAboutSecret = true;
    console.warn("DAILY_SECRET is not set; daily answers use the public development key.");
  }
  return FALLBACK_SECRET;
}

// FNV-1a with a murmur3 finalizer: cheap, stable, and well mixed enough that
// neighbouring ids land far apart in the daily order.
export function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

// Each era gets a fixed scrambled order that every player shares and that never
// repeats within one full cycle of its catalogue.
const dailyOrders = new Map<string, Movie[]>();

export function dailyAnswer(era: Era, puzzle: number) {
  const secret = dailySecret();
  const cacheKey = `${secret}:${era}`;
  let order = dailyOrders.get(cacheKey);
  if (!order) {
    const rank = (movie: Movie) => hashString(`${secret}:${era}:${movie.id}`);
    order = [...moviesForEra(era)].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
    dailyOrders.set(cacheKey, order);
  }
  return order[(((puzzle - 1) % order.length) + order.length) % order.length];
}
