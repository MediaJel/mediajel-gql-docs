import { createOpenAI } from "@ai-sdk/openai";

// Any OpenAI-compatible provider works here: set LLM_BASE_URL + LLM_API_KEY.
// Z.AI:       https://api.z.ai/api/coding/paas/v4   (coding plan; the general
//             /api/paas/v4 endpoint rejects a coding-plan key with code 1113)
// OpenRouter: https://openrouter.ai/api/v1
//
// The two are only meaningful as a pair. The chart marks LLM_API_KEY optional,
// so half a config is a real deploy outcome — and it would hand one vendor's
// key to the other's endpoint and 401 every chat behind a healthy pod.
const overrideUrl = process.env.LLM_BASE_URL;
const overrideKey = process.env.LLM_API_KEY;
const overrideActive = Boolean(overrideUrl && overrideKey);

if (Boolean(overrideUrl) !== Boolean(overrideKey)) {
  console.warn(
    `[llm-provider] Ignoring partial override (LLM_BASE_URL ${
      overrideUrl ? "set" : "unset"
    }, LLM_API_KEY ${overrideKey ? "set" : "unset"}). Falling back to OpenAI.`
  );
}

const baseURL = overrideActive ? overrideUrl : undefined;
const apiKey = overrideActive ? overrideKey : process.env.OPENAI_API_KEY;

// OpenRouter load-balances one model across hosts at different quantizations,
// so pin a provider when answer quality has to be reproducible.
const providerOrder = (process.env.LLM_PROVIDER_ORDER || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const pinnedFetch: typeof fetch = async (input, init) => {
  if (init?.body && typeof init.body === "string") {
    const body = JSON.parse(init.body);
    body.provider = { order: providerOrder, allow_fallbacks: false };
    init = { ...init, body: JSON.stringify(body) };
  }
  return fetch(input, init);
};

const provider = createOpenAI({
  apiKey,
  // 'strict' sends OpenAI-only fields that third-party gateways reject.
  ...(baseURL ? { baseURL, compatibility: "compatible" as const } : {}),
  ...(providerOrder.length ? { fetch: pinnedFetch } : {}),
});

// A model name only means something to the gateway it was configured for, so
// the fallback drops the configured names along with the base URL.
const CHAT_MODEL = (overrideActive && process.env.LLM_MODEL) || "gpt-4o";

// Gateways other than OpenAI have no gpt-4o-mini, so reuse the chat model there.
const PICKER_MODEL = overrideActive
  ? process.env.LLM_PICKER_MODEL || CHAT_MODEL
  : "gpt-4o-mini";

// GLM reasons on every call and cannot disable it; without a low effort the
// picker spends its whole budget reasoning and returns empty content.
const reasoningEffort = (process.env.LLM_REASONING_EFFORT ||
  (overrideActive ? "low" : "")) as "low" | "medium" | "high" | "";

const settings = reasoningEffort ? { reasoningEffort } : {};

export const chatModel = provider(CHAT_MODEL, settings);
export const pickerModel = provider(PICKER_MODEL, settings);
