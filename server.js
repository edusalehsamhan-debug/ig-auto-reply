/**
 * ig-auto-reply — ManyChat-style Instagram automation using Meta's OFFICIAL API.
 *
 * What it does:
 *  1. Listens for new comments on your posts/reels (webhook: "comments")
 *     → posts a public reply under the comment
 *     → sends the commenter a private DM (a "private reply")
 *  2. Listens for incoming DMs (webhook: "messages")
 *     → replies automatically based on keywords in rules.json
 *
 * Uses the "Instagram API with Instagram Login" (graph.instagram.com).
 * Edit rules.json to change keywords and replies — no code changes needed.
 */

import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────
const {
  APP_SECRET,
  VERIFY_TOKEN,
  IG_ACCESS_TOKEN,
  IG_ID,
  PORT = 3000,
  GRAPH_API_VERSION = "v25.0",
  DRY_RUN = "false",
} = process.env;

const GRAPH = `https://graph.instagram.com/${GRAPH_API_VERSION}`;
const dryRun = DRY_RUN === "true";

for (const [name, val] of Object.entries({ APP_SECRET, VERIFY_TOKEN, IG_ACCESS_TOKEN, IG_ID })) {
  if (!val) {
    console.error(`✖ Missing required env var: ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

// ── Rules (hot-reloaded on every event so you can edit rules.json live) ─
function loadRules() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "rules.json"), "utf8"));
}

function matchRule(rules, text) {
  const lower = (text || "").toLowerCase();
  for (const rule of rules) {
    if (!rule.keywords || rule.keywords.length === 0) return rule; // catch-all
    if (rule.keywords.some((k) => lower.includes(k.toLowerCase()))) return rule;
  }
  return null;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Deduplication (Meta may deliver the same event twice) ─────────────
const seen = new Set();
function alreadyHandled(id) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 5000) {
    // keep memory bounded — drop oldest half
    const keep = [...seen].slice(-2500);
    seen.clear();
    keep.forEach((k) => seen.add(k));
  }
  return false;
}

// ── Graph API helpers ─────────────────────────────────────────────────
async function graphPost(endpoint, body, label) {
  if (dryRun) {
    console.log(`[DRY RUN] Would ${label}:`, JSON.stringify(body));
    return { dryRun: true };
  }
  const res = await fetch(`${GRAPH}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${IG_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`✖ Failed to ${label}:`, res.status, JSON.stringify(json));
  } else {
    console.log(`✔ ${label}`);
  }
  return json;
}

/** Public reply posted under a comment. */
const replyToComment = (commentId, text) =>
  graphPost(`${commentId}/replies`, { message: text }, `reply publicly to comment ${commentId}`);

/** Private reply: DM the author of a comment (allowed up to 7 days, once per comment). */
const privateReplyToComment = (commentId, text) =>
  graphPost(
    `${IG_ID}/messages`,
    { recipient: { comment_id: commentId }, message: { text } },
    `send private reply for comment ${commentId}`
  );

/** DM a user who messaged you (24-hour response window). */
const sendDm = (userId, text) =>
  graphPost(
    `${IG_ID}/messages`,
    { recipient: { id: userId }, message: { text } },
    `send DM to ${userId}`
  );

// ── Event handlers ────────────────────────────────────────────────────
async function handleComment(value) {
  const commentId = value.id;
  const from = value.from || {};
  const text = value.text || "";

  if (String(from.id) === String(IG_ID)) return; // never reply to our own comments (avoids loops)
  if (alreadyHandled(`c:${commentId}`)) return;

  console.log(`💬 Comment from @${from.username || from.id}: "${text}"`);

  const { commentRules = [] } = loadRules();
  const rule = matchRule(commentRules, text);
  if (!rule) return console.log("  → no rule matched, ignoring");

  console.log(`  → matched rule "${rule.name}"`);
  if (rule.publicReplies?.length) await replyToComment(commentId, pick(rule.publicReplies));
  if (rule.dm) await privateReplyToComment(commentId, rule.dm);
}

async function handleMessage(event) {
  const senderId = event.sender?.id;
  const msg = event.message || {};

  if (msg.is_echo) return; // message sent BY us — ignore
  if (String(senderId) === String(IG_ID)) return;
  if (alreadyHandled(`m:${msg.mid}`)) return;
  if (!msg.text) return; // ignore attachments/likes for now

  console.log(`📩 DM from ${senderId}: "${msg.text}"`);

  const rules = loadRules();
  const rule = matchRule(rules.dmRules || [], msg.text);
  const reply = rule ? rule.reply : rules.dmFallback;
  if (!reply) return console.log("  → no rule matched and no fallback set, ignoring");

  console.log(`  → ${rule ? `matched rule "${rule.name}"` : "using fallback"}`);
  await sendDm(senderId, reply);
}

// ── Express app ───────────────────────────────────────────────────────
const app = express();

// Keep the raw body so we can verify Meta's signature.
app.use(express.json({ verify: (req, _res, buf) => (req.rawBody = buf) }));

function validSignature(req) {
  const sig = req.headers["x-hub-signature-256"];
  if (!sig || !req.rawBody) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(req.rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Health check
app.get("/", (_req, res) => res.send("ig-auto-reply is running ✔"));

// Simple privacy policy page (Meta requires a privacy policy URL to publish the app)
app.get("/privacy", (_req, res) => {
  res.type("html").send(`<!doctype html><html><head><meta charset="utf-8"><title>Privacy Policy</title></head>
<body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 16px;line-height:1.6">
<h1>Privacy Policy</h1>
<p>This application automatically responds to comments and direct messages on the owner's own Instagram professional account.</p>
<p>It processes comment text, message text, and sender IDs received from Meta's Instagram API solely to generate automatic replies. No personal data is stored, sold, or shared with third parties. Data is processed transiently in memory and not retained.</p>
<p>To request deletion of any data or to stop interacting with this automation, simply stop messaging or commenting, or contact the account owner via Instagram direct message.</p>
</body></html>`);
});

// Webhook verification handshake (Meta calls this once when you save the webhook URL)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✔ Webhook verified by Meta");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Webhook events
app.post("/webhook", (req, res) => {
  if (!validSignature(req)) {
    console.warn("✖ Invalid webhook signature — ignoring request");
    return res.sendStatus(401);
  }
  // Respond immediately (Meta requires a fast 200), then process async.
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== "instagram") return;

  for (const entry of body.entry || []) {
    // Comment events arrive under entry.changes with field "comments"
    for (const change of entry.changes || []) {
      if (change.field === "comments" && change.value) {
        handleComment(change.value).catch((e) => console.error("comment handler error:", e));
      }
    }
    // DM events arrive under entry.messaging
    for (const event of entry.messaging || []) {
      if (event.message) {
        handleMessage(event).catch((e) => console.error("message handler error:", e));
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 ig-auto-reply listening on port ${PORT}${dryRun ? " (DRY RUN mode)" : ""}`);
  console.log(`   Webhook endpoint: POST /webhook`);
});
