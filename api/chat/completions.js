import {
  buildChatPayload,
  isRouterConfigured,
  pipeSseResponse,
  routerChatFetch,
  ROUTER_MODEL,
} from "../../lib/inworld-router.mjs";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/** @type {import('@vercel/node').VercelRequest} */
export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isRouterConfigured()) {
    res.status(503).json({ error: "INWORLD_API_KEY is not configured" });
    return;
  }

  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  const stream = body.stream !== false;
  const metadata =
    body.metadata && typeof body.metadata === "object" ? body.metadata : undefined;

  try {
    const payload = buildChatPayload({
      messages,
      metadata,
      stream,
      model: body.model || ROUTER_MODEL,
    });

    const upstream = await routerChatFetch(payload);

    if (stream) {
      await pipeSseResponse(upstream, res);
      return;
    }

    const json = await upstream.json();
    res.status(200).json(json);
  } catch (err) {
    console.error("[router]", err.message);
    res.status(502).json({ error: err.message || "Router request failed" });
  }
}
