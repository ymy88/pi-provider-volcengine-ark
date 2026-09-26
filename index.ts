/**
 * Volcengine Ark (火山方舟, OpenAI-compatible coding endpoint) provider for pi.
 *
 * Endpoint: https://ark.cn-beijing.volces.com/api/coding/v3
 * Auth:     API key via $ARK_API_KEY (Bearer token)
 *
 * Model catalog refreshed 2026-09 against the endpoint's model square
 * (glm-5.2 / kimi-k2.6 / minimax-m2.7 were delisted; doubao-seed-2.x,
 * doubao-seed-evolving, deepseek-v4.1-flash, kimi-k3, glm-5.3-flash added).
 *
 * IMPORTANT: pi's extension config form (pi.registerProvider(name, {models}))
 * does NOT merge provider-level `compat` into each model — only per-model
 * `compat` is honored. So the shared compat fields live in BASE_COMPAT below and
 * are spread into every model's `compat`.
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
 *     param alongside it (kimi-k3 rejects the effort+disabled combination).
 *   - kimi-k2.7-code: `enable_thinking` is now IGNORED (thinking stays on) and
 *     the `thinking` param is rejected — it always thinks, reasoning captured.
 *   - glm-5.3 / glm-5.3-flash: plain reasoning_effort low/medium/high/max,
 *     always thinks (thinking.type disabled is rejected).
 *   - /models metadata can lag reality: it lists glm-5.3-flash / deepseek-v4.1*
 *     as text-only, but live image probes succeed on both.
 *
 * Pricing: doubao / glm models use Ark's official per-token CNY prices ÷ 7.27
 * (same conversion as the existing glm-5.3 entry); kimi-k3 / deepseek-v4.1-flash
 * mirror pi's Moonshot-CN / OpenCode catalogs (USD). Coding Plan itself bills
 * per request, so these are informational.
 *
 * Usage:
 *   export ARK_API_KEY=...
 *   pi            # then /model -> volcengine-ark/<model>
 *   pi --list-models
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

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

// glm-5.3 on Ark accepts plain reasoning_effort low/medium/high/max (verified).
// Thinking cannot be disabled; "low" produces near-zero reasoning, so off -> "low".
const GLM53_EFFORT = {
  off: "low",
  minimal: "low",
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: "max",
  max: "max",
} as const;

// Ark's `thinking: {"type": ...}` toggle models (doubao / kimi-k3 / deepseek-v4*):
// off really disables thinking (verified), high enables it (verified on every
// model below; low/medium verified on kimi-k3 and doubao-seed-2.1-pro).
const ARK_EFFORT = {
  off: "disabled",
  minimal: null,
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: null,
  max: null,
} as const;

const DEEPSEEK_EFFORT = {
  off: "disabled",
  minimal: null,
  low: null,
  medium: null,
  high: "high",
  xhigh: null,
  max: null,
} as const;

export default function (pi: ExtensionAPI) {
  pi.registerProvider("volcengine-ark", {
    name: "Volcengine Ark",
    baseUrl: "https://ark.cn-beijing.volces.com/api/coding/v3",
    apiKey: "$ARK_API_KEY",
    api: "openai-completions",
    models: [
      {
        id: "doubao-seed-2.1-pro",
        name: "Doubao Seed 2.1 Pro",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0.825, output: 4.125, cacheRead: 0.165, cacheWrite: 0 },
        contextWindow: 1_000_000,
        maxTokens: 262_144,
        thinkingLevelMap: ARK_EFFORT,
        compat: { ...BASE_COMPAT, thinkingFormat: "deepseek", supportsReasoningEffort: true },
      },
      {
        id: "doubao-seed-2.1-lite",
        name: "Doubao Seed 2.1 Lite",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0.11, output: 0.33, cacheRead: 0.022, cacheWrite: 0 },
        contextWindow: 1_000_000,
        maxTokens: 262_144,
        thinkingLevelMap: ARK_EFFORT,
        compat: { ...BASE_COMPAT, thinkingFormat: "deepseek", supportsReasoningEffort: true },
      },
      {
        id: "doubao-seed-2.0-mini",
        name: "Doubao Seed 2.0 Mini",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0.0275, output: 0.0825, cacheRead: 0.0055, cacheWrite: 0 },
        contextWindow: 262_144,
        maxTokens: 131_072,
        thinkingLevelMap: ARK_EFFORT,
        compat: { ...BASE_COMPAT, thinkingFormat: "deepseek", supportsReasoningEffort: true },
      },
      {
        id: "doubao-seed-evolving",
        name: "Doubao Seed Evolving",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0.825, output: 4.125, cacheRead: 0.165, cacheWrite: 0 },
        contextWindow: 1_000_000,
        maxTokens: 262_144,
        thinkingLevelMap: ARK_EFFORT,
        compat: { ...BASE_COMPAT, thinkingFormat: "deepseek", supportsReasoningEffort: true },
      },
      {
        id: "deepseek-v4-pro",
        name: "DeepSeek V4 Pro",
        reasoning: true,
        input: ["text"],
        cost: { input: 0.435, output: 0.87, cacheRead: 0.003625, cacheWrite: 0 },
        contextWindow: 1_000_000,
        maxTokens: 393_216,
        thinkingLevelMap: DEEPSEEK_EFFORT,
        compat: { ...BASE_COMPAT, thinkingFormat: "deepseek", supportsReasoningEffort: true },
      },
      {
        id: "deepseek-v4-flash",
        name: "DeepSeek V4 Flash",
        reasoning: true,
        input: ["text"],
        cost: { input: 0.14, output: 0.28, cacheRead: 0.0028, cacheWrite: 0 },
        contextWindow: 1_000_000,
        maxTokens: 393_216,
        thinkingLevelMap: DEEPSEEK_EFFORT,
        compat: { ...BASE_COMPAT, thinkingFormat: "deepseek", supportsReasoningEffort: true },
      },
      {
        id: "deepseek-v4.1-flash",
        name: "DeepSeek V4.1 Flash",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0.15, output: 0.6, cacheRead: 0.003, cacheWrite: 0 },
        contextWindow: 1_000_000,
        maxTokens: 393_216,
        thinkingLevelMap: DEEPSEEK_EFFORT,
        compat: { ...BASE_COMPAT, thinkingFormat: "deepseek", supportsReasoningEffort: true },
      },
      {
        id: "kimi-k3",
        name: "Kimi K3",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 0 },
        contextWindow: 1_048_576,
        maxTokens: 131_072,
        thinkingLevelMap: ARK_EFFORT,
        compat: { ...BASE_COMPAT, thinkingFormat: "deepseek", supportsReasoningEffort: true },
      },
      {
        id: "kimi-k2.7-code",
        name: "Kimi K2.7 Code",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0.73, output: 3.5, cacheRead: 0.15, cacheWrite: 0 },
        contextWindow: 262_144,
        maxTokens: 32_768,
        thinkingLevelMap: HIGH_ONLY,
        compat: { ...BASE_COMPAT, supportsReasoningEffort: false },
      },
      {
        id: "glm-5.3",
        name: "GLM-5.3",
        reasoning: true,
        input: ["text"],
        cost: { input: 1.1, output: 3.851, cacheRead: 0.275, cacheWrite: 0 },
        contextWindow: 1_000_000,
        maxTokens: 128_000,
        thinkingLevelMap: GLM53_EFFORT,
        compat: { ...BASE_COMPAT, supportsReasoningEffort: true },
      },
      {
        id: "glm-5.3-flash",
        name: "GLM-5.3 Flash",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0.11, output: 0.385, cacheRead: 0.032, cacheWrite: 0 },
        contextWindow: 1_000_000,
        maxTokens: 131_072,
        thinkingLevelMap: GLM53_EFFORT,
        compat: { ...BASE_COMPAT, supportsReasoningEffort: true },
      },
      {
        id: "minimax-m3",
        name: "MiniMax-M3",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0 },
        contextWindow: 512_000,
        maxTokens: 131_072,
        thinkingLevelMap: HIGH_ONLY,
        compat: { ...BASE_COMPAT, supportsReasoningEffort: false },
      },
    ],
  });
}
