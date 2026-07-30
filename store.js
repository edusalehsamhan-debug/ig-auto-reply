/**
 * store.js — persistence layer.
 *
 * Uses Upstash Redis (via its REST API) when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set, so your dashboard edits survive restarts.
 * If those aren't set, it falls back to the bundled rules.json (read-only)
 * so the bot still runs. No npm dependency needed — plain fetch().
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY = "ig-auto-reply:rules";

const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;
const hasDb = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

// ── default rules shipped with the app (used to seed an empty DB) ──────
function bundledRules() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "rules.json"), "utf8"));
  } catch {
    return { defaultCommentRules: [], defaultDmRules: [], dmFallback: "", categories: {}, postAssignments: {} };
  }
}

// ── Upstash REST helpers ──────────────────────────────────────────────
async function redis(command) {
  const res = await fetch(UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Upstash error ${res.status}: ${await res.text()}`);
  return (await res.json()).result;
}

// ── in-memory cache so we don't hit the DB on every webhook ───────────
let cache = null;
let cacheAt = 0;
const CACHE_MS = 5000;

export async function getRules({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cacheAt < CACHE_MS) return cache;

  if (!hasDb) {
    cache = bundledRules();
    cacheAt = Date.now();
    return cache;
  }

  try {
    const raw = await redis(["GET", KEY]);
    if (raw) {
      cache = JSON.parse(raw);
    } else {
      // first run: seed the DB from the bundled rules
      cache = bundledRules();
      await redis(["SET", KEY, JSON.stringify(cache)]);
    }
  } catch (e) {
    console.error("✖ store.getRules failed, using bundled rules:", e.message);
    cache = bundledRules();
  }
  cacheAt = Date.now();
  return cache;
}

export async function saveRules(rules) {
  cache = rules;
  cacheAt = Date.now();
  if (!hasDb) throw new Error("No database configured — set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
  await redis(["SET", KEY, JSON.stringify(rules)]);
  return true;
}

export const storageMode = hasDb ? "database" : "bundled-file (read-only)";
