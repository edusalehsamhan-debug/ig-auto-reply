/**
 * ig-auto-reply v2 — Instagram comment + DM automation with:
 *   • per-post and per-category keywords/replies
 *   • a password-protected web dashboard (/admin) to edit everything
 *   • database-backed storage (Upstash Redis) so edits persist
 *
 * Uses the "Instagram API with Instagram Login" (graph.instagram.com).
 */

import express from "express";
import crypto from "node:crypto";
import "dotenv/config";
import { getRules, saveRules, storageMode } from "./store.js";
import { dashboardHtml } from "./dashboard.js";

const {
  APP_SECRET,
  VERIFY_TOKEN,
  IG_ACCESS_TOKEN,
  IG_ID,
  ADMIN_PASSWORD,
  PORT = 3000,
  GRAPH_API_VERSION = "v25.0",
  DRY_RUN = "false",
} = process.env;

const GRAPH = `https://graph.instagram.com/${GRAPH_API_VERSION}`;
const dryRun = DRY_RUN === "true";

for (const [name, val] of Object.entries({ APP_SECRET, VERIFY_TOKEN, IG_ACCESS_TOKEN, IG_ID })) {
  if (!val) {
    console.error(`✖ Missing required env var: ${name}.`);
    process.exit(1);
  }
}
if (!ADMIN_PASSWORD) console.warn("⚠ ADMIN_PASSWORD not set — the /admin dashboard is disabled until you set it.");

// ── Rule matching ─────────────────────────────────────────────────────
function matchRule(rules, text) {
  const lower = (text || "").toLowerCase();
  for (const rule of rules || []) {
    if (!rule.keywords || rule.keywords.length === 0) return rule;
    if (rule.keywords.some((k) => lower.includes(String(k).toLowerCase()))) return rule;
  }
  return null;
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Choose which comment rule-set applies to a given media (post/reel) id. */
function commentRulesForMedia(all, mediaId) {
  const assign = all.postAssignments?.[mediaId];
  if (assign) {
    if (Array.isArray(assign.commentRules)) return assign.commentRules;       // custom per-post rules
    if (assign.category && all.categories?.[assign.category]) {
      return all.categories[assign.category].commentRules || [];              // category rules
    }
  }
  return all.defaultCommentRules || [];                                        // fallback
}

// ── Dedup (Meta may deliver the same event twice) ─────────────────────
const seen = new Set();
function alreadyHandled(id) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 5000) { const keep = [...seen].slice(-2500); seen.clear(); keep.forEach((k) => seen.add(k)); }
  return false;
}

// ── Graph API ─────────────────────────────────────────────────────────
async function graphPost(endpoint, body, label) {
  if (dryRun) { console.log(`[DRY RUN] ${label}:`, JSON.stringify(body)); return { dryRun: true }; }
  const res = await fetch(`${GRAPH}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${IG_ACCESS_TOKEN}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) console.error(`✖ ${label}:`, res.status, JSON.stringify(json));
  else console.log(`✔ ${label}`);
  return json;
}
const replyToComment = (id, text) => graphPost(`${id}/replies`, { message: text }, `public reply ${id}`);
const privateReply = (commentId, text) =>
  graphPost(`${IG_ID}/messages`, { recipient: { comment_id: commentId }, message: { text } }, `private reply ${commentId}`);
const sendDm = (userId, text) =>
  graphPost(`${IG_ID}/messages`, { recipient: { id: userId }, message: { text } }, `DM ${userId}`);

/** Fetch recent media so the dashboard can list posts to assign rules to. */
async function fetchRecentMedia() {
  if (dryRun) return [];
  const url = `${GRAPH}/${IG_ID}/media?fields=id,caption,media_type,thumbnail_url,media_url,permalink,timestamp&limit=25`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${IG_ACCESS_TOKEN}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { console.error("✖ fetch media:", JSON.stringify(json)); return []; }
  return json.data || [];
}

// ── Event handlers ────────────────────────────────────────────────────
async function handleComment(value) {
  const commentId = value.id;
  const from = value.from || {};
  const text = value.text || "";
  const mediaId = value.media?.id;

  if (String(from.id) === String(IG_ID)) return;          // ignore our own comments
  if (alreadyHandled(`c:${commentId}`)) return;
  console.log(`💬 Comment on media ${mediaId} from @${from.username || from.id}: "${text}"`);

  const all = await getRules();
  const rule = matchRule(commentRulesForMedia(all, mediaId), text);
  if (!rule) return console.log("  → no rule matched");
  console.log(`  → matched "${rule.name}"`);
  if (rule.publicReplies?.length) await replyToComment(commentId, pick(rule.publicReplies));
  if (rule.dm) await privateReply(commentId, rule.dm);
}

async function handleMessage(event) {
  const senderId = event.sender?.id;
  const msg = event.message || {};
  if (msg.is_echo || String(senderId) === String(IG_ID)) return;
  if (alreadyHandled(`m:${msg.mid}`)) return;
  if (!msg.text) return;
  console.log(`📩 DM from ${senderId}: "${msg.text}"`);

  const all = await getRules();
  const rule = matchRule(all.defaultDmRules, msg.text);
  const reply = rule ? rule.reply : all.dmFallback;
  if (!reply) return console.log("  → no DM rule and no fallback");
  console.log(`  → ${rule ? `matched "${rule.name}"` : "fallback"}`);
  await sendDm(senderId, reply);
}

// ── App ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ verify: (req, _res, buf) => (req.rawBody = buf) }));

function validSignature(req) {
  const sig = req.headers["x-hub-signature-256"];
  if (!sig || !req.rawBody) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(req.rawBody).digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); } catch { return false; }
}

// ── Admin auth (simple signed cookie from ADMIN_PASSWORD) ─────────────
function adminToken() {
  return crypto.createHmac("sha256", APP_SECRET).update("admin:" + (ADMIN_PASSWORD || "")).digest("hex");
}
function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").map((c) => c.trim().split("=").map(decodeURIComponent)).filter((p) => p[0]));
}
function isAdmin(req) {
  return ADMIN_PASSWORD && parseCookies(req).ig_admin === adminToken();
}

app.get("/", (_req, res) => res.send("ig-auto-reply v2 is running ✔  (dashboard at /admin)"));

app.get("/privacy", (_req, res) => {
  res.type("html").send(`<!doctype html><meta charset="utf-8"><title>Privacy Policy</title>
<div style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 16px;line-height:1.6">
<h1>Privacy Policy</h1>
<p>This application automatically responds to comments and direct messages on the owner's own Instagram professional account.</p>
<p>It processes comment text, message text, and sender IDs from Meta's Instagram API solely to generate automatic replies. No personal data is sold or shared with third parties, and message content is not retained beyond what is needed to respond.</p>
<p>To request data deletion or stop interacting, contact the account owner via Instagram direct message.</p></div>`);
});

// Webhook verification
app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === VERIFY_TOKEN) {
    console.log("✔ Webhook verified by Meta");
    return res.status(200).send(req.query["hub.challenge"]);
  }
  return res.sendStatus(403);
});

// Webhook events
app.post("/webhook", (req, res) => {
  if (!validSignature(req)) { console.warn("✖ Invalid webhook signature"); return res.sendStatus(401); }
  res.sendStatus(200);
  const body = req.body;
  if (body.object !== "instagram") return;
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === "comments" && change.value) handleComment(change.value).catch((e) => console.error("comment err:", e));
    }
    for (const event of entry.messaging || []) {
      if (event.message) handleMessage(event).catch((e) => console.error("message err:", e));
    }
  }
});

// ── Dashboard routes ──────────────────────────────────────────────────
app.get("/admin", (req, res) => res.type("html").send(dashboardHtml(isAdmin(req))));

app.post("/admin/login", (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(400).json({ error: "ADMIN_PASSWORD not set on server." });
  if (req.body?.password === ADMIN_PASSWORD) {
    res.setHeader("Set-Cookie", `ig_admin=${adminToken()}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`);
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: "Wrong password" });
});

app.post("/admin/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "ig_admin=; HttpOnly; Path=/; Max-Age=0");
  res.json({ ok: true });
});

app.get("/admin/rules", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Not logged in" });
  res.json(await getRules({ fresh: true }));
});

app.post("/admin/rules", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Not logged in" });
  try { await saveRules(req.body); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/admin/media", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Not logged in" });
  res.json({ media: await fetchRecentMedia() });
});

app.listen(PORT, () => {
  console.log(`🚀 ig-auto-reply v2 on port ${PORT}${dryRun ? " (DRY RUN)" : ""} — storage: ${storageMode}`);
});
