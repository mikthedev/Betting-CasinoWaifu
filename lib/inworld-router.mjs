/**
 * Inworld Router — OpenAI-compatible chat completions proxy helpers.
 * API key is read from INWORLD_API_KEY only (Basic auth, base64 key:secret).
 */

export const ROUTER_CHAT_URL =
  process.env.INWORLD_ROUTER_URL || "https://api.inworld.ai/v1/chat/completions";

export const ROUTER_MODEL =
  process.env.INWORLD_ROUTER_MODEL || "inworld/yuki-for-betting";

export function getBasicAuthHeader() {
  const key = (process.env.INWORLD_API_KEY || "").trim();
  return key ? `Basic ${key}` : null;
}

export function isRouterConfigured() {
  return !!getBasicAuthHeader();
}

/**
 * Build a chat completions request body for the Yuki betting router.
 * @param {{ messages: object[], metadata?: Record<string, unknown>, stream?: boolean, model?: string }} opts
 */
export function buildChatPayload({ messages, metadata, stream = true, model }) {
  const payload = {
    model: model || ROUTER_MODEL,
    messages,
    stream: !!stream,
  };

  if (metadata && Object.keys(metadata).length) {
    payload.extra_body = { metadata };
  }

  return payload;
}

/**
 * POST to Inworld Router chat completions.
 * @returns {Promise<Response>}
 */
export async function routerChatFetch(body) {
  const auth = getBasicAuthHeader();
  if (!auth) throw new Error("INWORLD_API_KEY is not configured");

  const res = await fetch(ROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: body.stream ? "text/event-stream" : "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Router error (${res.status}): ${text.slice(0, 400)}`);
  }

  return res;
}

/** Pipe an upstream SSE response to a Node HTTP response. */
export async function pipeSseResponse(upstream, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } finally {
    res.end();
  }
}
