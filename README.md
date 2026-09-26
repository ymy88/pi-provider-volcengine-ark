# pi-provider-volcengine-ark

A [pi](https://pi.dev/) provider extension for **Volcengine Ark** (火山方舟, OpenAI-compatible coding endpoint).

## Setup

Set your Ark API key as an environment variable:

```sh
export ARK_API_KEY=...
```

## Install

```sh
pi install npm:pi-provider-volcengine-ark
```

Then in pi: run `/reload` (or restart pi), then pick a model with `/model` → `volcengine-ark/<model>`.

## Endpoint

`https://ark.cn-beijing.volces.com/api/coding/v3` — the public Volcengine Ark coding endpoint.

## Available models

| Model ID | Input | Context | Output | Notes |
| --- | --- | --- | --- | --- |
| `doubao-seed-2.1-pro` | text+image | 1M | 262k | thinking toggle + effort |
| `doubao-seed-2.1-lite` | text+image | 1M | 262k | thinking toggle + effort |
| `doubao-seed-2.0-mini` | text+image | 262k | 131k | thinking toggle + effort |
| `doubao-seed-evolving` | text+image | 1M | 262k | thinking toggle + effort, weekly-updated |
| `deepseek-v4-pro` | text | 1M | 384k | thinking toggle, effort high |
| `deepseek-v4-flash` | text | 1M | 384k | thinking toggle, effort high |
| `deepseek-v4.1-flash` | text+image | 1M | 384k | thinking toggle, effort high |
| `kimi-k3` | text+image | 1M | 131k | thinking toggle + effort |
| `kimi-k2.7-code` | text+image | 262k | 32k | always thinks, reasoning captured |
| `glm-5.3` | text | 1M | 128k | reasoning_effort low..max (low ≈ off) |
| `glm-5.3-flash` | text+image | 1M | 131k | reasoning_effort low..max (low ≈ off) |
| `minimax-m3` | text+image | 512k | 131k | always thinks, reasoning captured |

All model facts were verified against the live endpoint (2026-09): `max_tokens` caps via the endpoint's `InvalidParameter` error, context windows and input modalities via `GET /models` plus image probes, and thinking parameters via behavior diffs. `glm-5.2`, `kimi-k2.6`, and `minimax-m2.7` were delisted from the coding endpoint and removed.

Doubao, kimi-k3 and deepseek models use Ark's `thinking: {"type": "enabled"|"disabled"}` toggle — `off` genuinely disables thinking. `kimi-k2.7-code` no longer honors `enable_thinking` (thinking stays on), so it's configured as always-thinking with reasoning captured. Per-model `max_tokens` caps: glm 128000/131072, deepseek-v4* 393216, minimax 131072, kimi 32768/131072, doubao 131072/262144.

## How it works

`pi.registerProvider("volcengine-ark", { ... })` registers the provider with its endpoint, auth (`$ARK_API_KEY` env var), and a per-model catalog (context window, output limit, pricing, reasoning/compat options). The extension only runs inside pi — list it as a `peerDependency` on `@earendil-works/pi-coding-agent`.

## License

MIT
