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
| `glm-5.3` | text | 1M | 128k | reasoning_effort low..max (low ≈ off) |
| `glm-5.2` | text | 1M | 128k | no toggle, reasoning captured |
| `kimi-k2.7-code` | text+image | 262k | 128k | thinking toggle (qwen) |
| `deepseek-v4-pro` | text | 1M | 128k | effort-based thinking (deepseek) |
| `deepseek-v4-flash` | text | 1M | 128k | effort-based thinking (deepseek) |
| `minimax-m3` | text+image | 512k | 128k | no toggle, reasoning captured |
| `minimax-m2.7` | text | 205k | 128k | no toggle, reasoning captured |
| `kimi-k2.6` | text+image | 262k | 16k | thinking toggle (qwen) |

Only the `high` thinking level is exposed for kimi/deepseek models (per request). `glm-5.3` accepts `reasoning_effort` `low`/`medium`/`high`/`max` (thinking cannot be disabled; `low` ≈ off). `maxTokens` is capped at 128000 on Ark — the backend rejects `max_tokens` above that with a 400 `InvalidParameter` error, even for models whose official output limit is larger.

## How it works

`pi.registerProvider("volcengine-ark", { ... })` registers the provider with its endpoint, auth (`$ARK_API_KEY` env var), and a per-model catalog (context window, output limit, pricing, reasoning/compat options). The extension only runs inside pi — list it as a `peerDependency` on `@earendil-works/pi-coding-agent`.

## License

MIT
