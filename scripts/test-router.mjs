/**
 * Smoke test — Inworld Router chat completions (streaming)
 * Usage: node scripts/test-router.mjs
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildChatPayload,
  isRouterConfigured,
  ROUTER_MODEL,
  routerChatFetch,
} from "../lib/inworld-router.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

if (!isRouterConfigured()) {
  console.error("FAIL: INWORLD_API_KEY not set in .env");
  process.exit(1);
}

console.log(`Model: ${ROUTER_MODEL}`);

const payload = buildChatPayload({
  messages: [
    {
      role: "user",
      content: "Hey Yuki! Who is your top tennis pick right now?",
    },
  ],
  metadata: {
    app: "betting-casinowaifu",
    intent: "best_pick",
    flow_state: "idle",
  },
  stream: true,
});

const res = await routerChatFetch(payload);
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
let text = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (data === "[DONE]") break;
    try {
      const chunk = JSON.parse(data);
      const part = chunk.choices?.[0]?.delta?.content;
      if (part) {
        process.stdout.write(part);
        text += part;
      }
    } catch (_) {}
  }
}

console.log(text.trim() ? "\n\nSUCCESS" : "\nFAIL: empty response");
process.exit(text.trim() ? 0 : 1);
