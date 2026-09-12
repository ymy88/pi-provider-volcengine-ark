/**
 * Volcengine Ark (火山方舟, OpenAI-compatible coding endpoint) provider for pi.
 *
 * Endpoint: https://ark.cn-beijing.volces.com/api/coding/v3
 * Auth:     /login volcengine-ark (paste an Ark API key; stored in auth.json),
 *           falling back to $ARK_API_KEY when nothing is stored.
 *
 * Registered as a full pi-ai provider (createProvider) rather than the legacy
 * config form, so it can offer the api-key /login flow like built-in providers.
 *
 * Model catalog refreshed 2026-09 against the endpoint's model square
 * (glm-5.2 / kimi-k2.6 / minimax-m2.7 were delisted; doubao-seed-2.x,
 * doubao-seed-evolving, deepseek-v4.1-flash, kimi-k3, glm-5.3-flash and the
 * ark-code-latest router added).
 *
 * IMPORTANT: pi's extension config form (pi.registerProvider(name, {models}))
 * does NOT merge provider-level `compat` into each model — only per-model
 * `compat` is honored. So the shared compat fields live in BASE_COMPAT below and
 * are spread into every model's `compat` by the `ark()` helper.
 *
 * All per-model facts below were verified against the live endpoint (probes via
 * $ARK_API_KEY, 2026-09): max_tokens caps via the endpoint's InvalidParameter
 * error naming the exact cap, context windows / input modalities via
 * GET /models plus image probes, thinking params via behavior diffs.
 * Notable endpoint facts:
 *   - maxTokens caps: glm 128000-131072, deepseek-v4* 393216, minimax 131072,
 *     kimi 32768-131072, doubao 131072-262144. (doubao-seed-2.1-pro does not
 *     validate max_tokens; its /models entry caps it at 262144.)
 *   - Doubao + kimi-k3 + deepseek models accept `thinking: {"type":
 *     "enabled"|"disabled"}` (pi's "deepseek" thinkingFormat) — a real toggle,
 *     verified to zero out reasoning_content. reasoning_effort is a validated
 *     param alongside it (low/medium/high/max verified on kimi-k3 and
 *     doubao-seed-*; kimi-k3 rejects the effort+disabled combination).
 *   - kimi-k2.7-code: `enable_thinking` is now IGNORED (thinking stays on) and
 *     the `thinking` param is rejected — it always thinks, reasoning captured.
 *   - glm-5.3 / glm-5.3-flash: plain reasoning_effort low/medium/high/max,
 *     always thinks (thinking.type disabled is rejected).
 *   - /models metadata can lag reality: it lists glm-5.3-flash / deepseek-v4.1*
 *     as text-only, but live image probes succeed on both.
 *   - ark-code-latest is a Coding Plan router ("auto"): its effective max_tokens
 *     cap depends on the routed model (262144 and 131072 both observed), so it
 *     is capped at 128000, the floor of the routable catalog.
 *
 * Pricing: doubao / glm models use Ark's official per-token CNY prices ÷ 7.27
 * (same conversion as the existing glm-5.3 entry); kimi-k3 / deepseek-v4.1-flash
 * mirror pi's Moonshot-CN / OpenCode catalogs (USD). Coding Plan itself bills
 * per request, so these are informational.
 *
 * Usage:
 *   /login volcengine-ark     (or: export ARK_API_KEY=...)
 *   pi            # then /model -> volcengine-ark/<model>
 *   pi --list-models
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  createProvider,
  envApiKeyAuth,
  openAICompletionsApi,
  type Model,
} from "@earendil-works/pi-ai";

const ENDPOINT = "https://ark.cn-beijing.volces.com/api/coding/v3";
const PROVIDER_ID = "volcengine-ark";

const BASE_COMPAT = {
  supportsDeveloperRole: false,
  supportsStore: false,
  supportsStrictMode: false,
  maxTokensField: "max_tokens" as const,
};

const HIGH_ONLY = {
  off: null,
  minimal: null,
  low: null,
  medium: null,
  high: "high",
  xhigh: null,
  max: null,
} as const;

// glm-5.3 / glm-5.3-flash on Ark accept plain reasoning_effort low/medium/high/max
// (verified). Thinking cannot be disabled; "low" produces near-zero reasoning,
// so off -> "low".
const GLM53_EFFORT = {
  off: "low",
  minimal: "low",
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: "max",
  max: "max",
} as const;

// Ark's `thinking: {"type": ...}` toggle models (doubao / kimi-k3): off really
// disables thinking (verified), and reasoning_effort low/medium/high/max is
// accepted alongside the toggle (verified on kimi-k3 and doubao-seed-*).
// The off value's string is unused; non-null means "off" is offered and maps to
// thinking disabled.
const ARK_EFFORT = {
  off: "off",
  minimal: null,
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: "max",
  max: "max",
} as const;

// deepseek-v4* share the thinking toggle but only `high` is verified for
// reasoning_effort; off genuinely disables thinking.
const DEEPSEEK_EFFORT = {
  off: "disabled",
  minimal: null,
  low: null,
  medium: null,
  high: "high",
  xhigh: null,
  max: null,
} as const;

type ArkModel = Omit<Model<"openai-completions">, "api" | "provider" | "baseUrl">;

const ark = (m: ArkModel): Model<"openai-completions"> => ({
  ...m,
  api: "openai-completions",
  provider: PROVIDER_ID,
  baseUrl: ENDPOINT,
  compat: { ...BASE_COMPAT, ...m.compat },
});

const MODELS: Model<"openai-completions">[] = [
  ark({
    // "Auto": Ark Coding Plan smart routing — always uses the current best model.
    id: "ark-code-latest",
    name: "Auto (ark-code-latest)",
    reasoning: false,
    input: ["text", "image"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 262_144,
    maxTokens: 128_000,
  }),
  ark({
    id: "doubao-seed-2.1-pro",
    name: "Doubao Seed 2.1 Pro",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.825, output: 4.125, cacheRead: 0.165, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 262_144,
    thinkingLevelMap: ARK_EFFORT,
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
  }),
  ark({
    id: "doubao-seed-2.1-lite",
    name: "Doubao Seed 2.1 Lite",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.11, output: 0.33, cacheRead: 0.022, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 262_144,
    thinkingLevelMap: ARK_EFFORT,
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
  }),
  ark({
    id: "doubao-seed-2.1-turbo",
    name: "Doubao Seed 2.1 Turbo",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.41, output: 2.06, cacheRead: 0.08, cacheWrite: 0 },
    contextWindow: 262_144,
    maxTokens: 262_144,
    thinkingLevelMap: ARK_EFFORT,
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
  }),
  ark({
    id: "doubao-seed-2.0-mini",
    name: "Doubao Seed 2.0 Mini",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.0275, output: 0.0825, cacheRead: 0.0055, cacheWrite: 0 },
    contextWindow: 262_144,
    maxTokens: 131_072,
    thinkingLevelMap: ARK_EFFORT,
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
  }),
  ark({
    id: "doubao-seed-2.0-lite",
    name: "Doubao Seed 2.0 Lite",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.2, output: 1.2, cacheRead: 0.04, cacheWrite: 0 },
    contextWindow: 262_144,
    maxTokens: 131_072,
    thinkingLevelMap: ARK_EFFORT,
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
  }),
  ark({
    id: "doubao-seed-evolving",
    name: "Doubao Seed Evolving",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.825, output: 4.125, cacheRead: 0.165, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 262_144,
    thinkingLevelMap: ARK_EFFORT,
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
  }),
  ark({
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    reasoning: true,
    input: ["text"],
    cost: { input: 0.435, output: 0.87, cacheRead: 0.003625, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 393_216,
    thinkingLevelMap: DEEPSEEK_EFFORT,
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
  }),
  ark({
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    reasoning: true,
    input: ["text"],
    cost: { input: 0.14, output: 0.28, cacheRead: 0.0028, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 393_216,
    thinkingLevelMap: DEEPSEEK_EFFORT,
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
  }),
  ark({
    id: "deepseek-v4.1-flash",
    name: "DeepSeek V4.1 Flash",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.15, output: 0.6, cacheRead: 0.003, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 393_216,
    thinkingLevelMap: DEEPSEEK_EFFORT,
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
  }),
  ark({
    id: "kimi-k3",
    name: "Kimi K3",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 0 },
    contextWindow: 1_048_576,
    maxTokens: 131_072,
    thinkingLevelMap: ARK_EFFORT,
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
  }),
  ark({
    // enable_thinking is ignored and `thinking` is rejected on Ark: always
    // thinks, reasoning captured.
    id: "kimi-k2.7-code",
    name: "Kimi K2.7 Code",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.73, output: 3.5, cacheRead: 0.15, cacheWrite: 0 },
    contextWindow: 262_144,
    maxTokens: 32_768,
    thinkingLevelMap: HIGH_ONLY,
    compat: { supportsReasoningEffort: false },
  }),
  ark({
    id: "glm-5.3",
    name: "GLM-5.3",
    reasoning: true,
    input: ["text"],
    cost: { input: 1.1, output: 3.851, cacheRead: 0.275, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 128_000,
    thinkingLevelMap: GLM53_EFFORT,
    compat: { supportsReasoningEffort: true },
  }),
  ark({
    id: "glm-5.3-flash",
    name: "GLM-5.3 Flash",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.11, output: 0.385, cacheRead: 0.032, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 131_072,
    thinkingLevelMap: GLM53_EFFORT,
    compat: { supportsReasoningEffort: true },
  }),
  ark({
    id: "minimax-m3",
    name: "MiniMax-M3",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0 },
    contextWindow: 512_000,
    maxTokens: 131_072,
    thinkingLevelMap: HIGH_ONLY,
    compat: { supportsReasoningEffort: false },
  }),
];

export default function (pi: ExtensionAPI) {
  pi.registerProvider(
    createProvider({
      id: PROVIDER_ID,
      name: "Volcengine Ark",
      baseUrl: ENDPOINT,
      // /login volcengine-ark prompts for the API key (stored in auth.json);
      // $ARK_API_KEY is the fallback when nothing is stored.
      auth: { apiKey: envApiKeyAuth("Volcengine Ark API key", ["ARK_API_KEY"]) },
      models: MODELS,
      api: openAICompletionsApi(),
    })
  );
}
