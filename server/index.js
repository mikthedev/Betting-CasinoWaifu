/**
 * Yuki server — static site + Inworld Realtime WebSocket proxy
 *
 * Browser ←WebSocket→ this server ←WebSocket→ Inworld API
 *
 * INWORLD_API_KEY is read from process.env only — never sent to the client.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import {
  buildChatPayload,
  isRouterConfigured,
  pipeSseResponse,
  routerChatFetch,
} from "../lib/inworld-router.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const LOCAL_TESTING = path.join(ROOT, "local-testing");
const RECORDS_DIR = path.join(LOCAL_TESTING, "records");
const RECORDER_ENABLED = fs.existsSync(path.join(LOCAL_TESTING, "sessionRecorder.js"));

dotenv.config({ path: path.join(ROOT, ".env") });

const PORT = Number(process.env.PORT) || 8787;
const INWORLD_API_KEY = process.env.INWORLD_API_KEY || "";
const INWORLD_WS_BASE = "wss://api.inworld.ai/api/v1/realtime/session";

if (RECORDER_ENABLED) {
  fs.mkdirSync(RECORDS_DIR, { recursive: true });
}

const RECORDER_SCRIPTS = `
    <link rel="stylesheet" href="/local-testing/sessionRecorder.css" />
    <script src="/local-testing/costRates.js"></script>
    <script src="/local-testing/sessionRecorder.js"></script>`;

function isLocalRequest(req) {
  const host = req.headers.host || "";
  const hostname = host.split(":")[0];
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return true;
  if (/^192\.168\./.test(hostname) || /^10\./.test(hostname)) return true;
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (ip === "127.0.0.1" || ip === "::1") return true;
    if (/^192\.168\./.test(ip) || /^10\./.test(ip)) return true;
  }
  const remote = req.socket?.remoteAddress || "";
  if (remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1") return true;
  if (/^192\.168\./.test(remote) || /^10\./.test(remote) || /^::ffff:192\.168\./.test(remote)) return true;
  return false;
}

function injectRecorder(html) {
  if (!RECORDER_ENABLED || !html.includes("</body>")) return html;
  const marker = '<script src="js/runtime.js"></script>';
  if (html.includes(marker)) {
    return html.replace(marker, RECORDER_SCRIPTS + "\n    " + marker);
  }
  return html.replace("</body>", RECORDER_SCRIPTS + "\n  </body>");
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function saveSessionRecord(data) {
  const id = data.id || `session-${Date.now()}`;
  const filePath = path.join(RECORDS_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

  const indexPath = path.join(RECORDS_DIR, "index.json");
  let index = [];
  try {
    index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch (_) {
    index = [];
  }
  index.unshift({
    id,
    startTime: data.startTime,
    endTime: data.endTime,
    durationMs: data.durationMs,
    totalCost: data.costs?.total,
    assistantMsgs: data.messages?.assistant ?? 0,
    savedAt: new Date().toISOString(),
    file: path.basename(filePath),
  });
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
  return { path: `local-testing/records/${path.basename(filePath)}`, id };
}

function computeHistoricalAverages() {
  const indexPath = path.join(RECORDS_DIR, "index.json");
  let index = [];
  try {
    index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch (_) {
    index = [];
  }
  if (!index.length) {
    return { sessionCount: 0, avgCostPerMinute: null, avgCostPerSession: null, avgCostPerRequest: null };
  }
  let totalCost = 0;
  let totalDurationMs = 0;
  let totalRequests = 0;
  for (const entry of index) {
    let record = entry;
    const filePath = path.join(RECORDS_DIR, entry.file || `${entry.id}.json`);
    if (fs.existsSync(filePath)) {
      try {
        record = { ...entry, ...JSON.parse(fs.readFileSync(filePath, "utf8")) };
      } catch (_) {}
    }
    totalCost += record.costs?.total ?? record.totalCost ?? 0;
    totalDurationMs += record.durationMs ?? 0;
    totalRequests += record.messages?.assistant ?? record.assistantMsgs ?? 0;
  }
  const sessionCount = index.length;
  const totalMinutes = totalDurationMs / 60000;
  return {
    sessionCount,
    avgCostPerMinute: totalMinutes > 0 ? totalCost / totalMinutes : null,
    avgCostPerSession: sessionCount > 0 ? totalCost / sessionCount : null,
    avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : null,
  };
}

function serveLocalTesting(urlPath, res) {
  const rel = urlPath.replace(/^\/local-testing\/?/, "");
  if (!rel || rel.includes("..")) {
    res.writeHead(404);
    res.end("Not found");
    return true;
  }
  const filePath = path.join(LOCAL_TESTING, rel);
  if (!filePath.startsWith(LOCAL_TESTING) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return true;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(fs.readFileSync(filePath));
  return true;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".vrm": "model/gltf-binary",
  ".glb": "model/gltf-binary",
  ".wasm": "application/wasm",
};

function serveStatic(req, res, injectRecorderScripts = false) {
  let urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  if (RECORDER_ENABLED && urlPath.startsWith("/local-testing/")) {
    serveLocalTesting(urlPath, res);
    return;
  }
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    let body = data;
    if (injectRecorderScripts && ext === ".html") {
      body = Buffer.from(injectRecorder(data.toString("utf8")), "utf8");
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(body);
  });
}

function setCors(req, res, methods = "GET, OPTIONS") {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function handleRouterChat(req, res) {
  setCors(req, res, "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (!isRouterConfigured()) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "INWORLD_API_KEY is not configured" }));
    return;
  }

  let raw = "";
  for await (const chunk of req) raw += chunk;

  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON body" }));
    return;
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "messages array is required" }));
    return;
  }

  const stream = body.stream !== false;
  const metadata =
    body.metadata && typeof body.metadata === "object" ? body.metadata : undefined;

  try {
    const payload = buildChatPayload({ messages, metadata, stream, model: body.model });
    const upstream = await routerChatFetch(payload);

    if (stream) {
      await pipeSseResponse(upstream, res);
      return;
    }

    const json = await upstream.json();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(json));
  } catch (err) {
    console.error("[router]", err.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message || "Router request failed" }));
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const local = isLocalRequest(req);

  if (RECORDER_ENABLED && req.method === "GET" && pathname === "/local-testing/api/sessions/summary") {
    if (!local) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Local requests only" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(computeHistoricalAverages()));
    return;
  }

  if (RECORDER_ENABLED && req.method === "POST" && pathname === "/local-testing/api/sessions") {
    if (!local) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Local requests only" }));
      return;
    }
    try {
      const data = JSON.parse(await readBody(req));
      const saved = saveSessionRecord(data);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, ...saved }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Invalid session data" }));
    }
    return;
  }

  if (pathname === "/api/chat/completions") {
    handleRouterChat(req, res);
    return;
  }

  if (req.method === "OPTIONS") {
    setCors(req, res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health") {
    setCors(req, res);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      inworld: !!INWORLD_API_KEY,
      router: isRouterConfigured(),
      devRecorder: RECORDER_ENABLED && local,
    }));
    return;
  }
  serveStatic(req, res, RECORDER_ENABLED);
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname !== "/realtime") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (clientWs) => {
    wss.emit("connection", clientWs, req);
  });
});

wss.on("connection", (clientWs) => {
  if (!INWORLD_API_KEY) {
    clientWs.send(
      JSON.stringify({
        type: "error",
        error: { message: "INWORLD_API_KEY is not configured on the server." },
      })
    );
    clientWs.close(1011, "missing-api-key");
    return;
  }

  const sessionKey = `voice-${Date.now()}`;
  const upstreamUrl = `${INWORLD_WS_BASE}?key=${encodeURIComponent(sessionKey)}&protocol=realtime`;

  const upstream = new WebSocket(upstreamUrl, {
    headers: {
      Authorization: `Basic ${INWORLD_API_KEY}`,
    },
  });

  let upstreamOpen = false;
  const pending = [];

  const forwardToUpstream = (text) => {
    if (upstreamOpen && upstream.readyState === WebSocket.OPEN) {
      upstream.send(text);
    } else {
      pending.push(text);
    }
  };

  upstream.on("open", () => {
    upstreamOpen = true;
    while (pending.length) upstream.send(pending.shift());
  });

  upstream.on("message", (data) => {
    const text = typeof data === "string" ? data : data.toString("utf8");
    if (clientWs.readyState === WebSocket.OPEN) clientWs.send(text);
  });

  upstream.on("error", (err) => {
    console.error("[proxy] upstream error:", err.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: "error", error: { message: err.message } }));
    }
  });

  upstream.on("close", (code, reason) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code || 1000, reason.toString());
    }
  });

  clientWs.on("message", (data) => {
    const text = typeof data === "string" ? data : data.toString("utf8");
    forwardToUpstream(text);
  });

  clientWs.on("close", () => {
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
      upstream.close();
    }
  });

  clientWs.on("error", (err) => {
    console.error("[proxy] client error:", err.message);
    upstream.close();
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Yuki server  http://localhost:${PORT}`);
  console.log(`Betting app  http://localhost:${PORT}/`);
  console.log(`WebSocket    ws://localhost:${PORT}/realtime`);
  if (RECORDER_ENABLED) {
    console.log(`Recorder     enabled on localhost → local-testing/records/`);
  }
  if (!INWORLD_API_KEY) {
    console.warn("WARNING: INWORLD_API_KEY is not set — voice chat will not connect.");
  }
});
