# OpenRouter Skill

OpenRouter Skill is an installable agent skill for AI agents that need reliable OpenRouter integration patterns: model discovery, provider discovery, free-model filtering, image generation, generation cost lookup, multimodal chat, tool calling, structured output, routing, and starter templates.

This is useful when the real problem is not “how do I call one model once,” but “how do I keep an agent effective while models, providers, modalities, and prices keep changing?”

Landing page: `https://bnishit.github.io/openrouter-skill/`

## Install

Install with the `skills` CLI for the agent you use:

```bash
npx skills add bnishit/openrouter-skill --agent <your-agent>
```

If your agent runtime supports the `skills` install flow, this repository is intended to work as a reusable OpenRouter skill there as well.

## Compatibility

The public repository name is `openrouter-skill`, but the installed skill trigger remains `openrouter-integration` for compatibility with existing prompts and local setups.

Direct git install still works:

```bash
git clone https://github.com/bnishit/openrouter-skill.git \
  ~/.codex/skills/openrouter-integration
```

## What It Covers

- model discovery and searchable model pickers
- provider discovery and provider-aware routing
- free-model filtering from the live catalog
- generation cost lookup and post-hoc billing inspection
- image generation through OpenRouter's chat-completions flow
- chat completions and streaming
- structured JSON responses
- multimodal requests with images and PDFs
- tool calling and multi-step agent loops
- model routing and provider fallback policies
- reusable Next.js and Express starter templates

## Example Prompts

- `Use $openrouter-integration to add an OpenRouter model picker to this app.`
- `Use $openrouter-integration to add provider and free-model filters to this OpenRouter model catalog.`
- `Use $openrouter-integration to fetch a completed OpenRouter generation and show its exact cost.`
- `Use $openrouter-integration to add image generation plus image and PDF chat support through an OpenRouter server route.`
- `Use $openrouter-integration to wire tool calling and provider fallback handling into this project.`

## When It Helps

- when a new model or modality shows up and the agent should adapt without rewriting the whole integration
- when a team wants to add image generation quickly without switching to a separate provider-specific SDK
- when the app needs provider-aware routing or low-cost / free-model views instead of a single fixed model
- when someone asks why a generation cost what it did and the answer needs exact lookup, not rough estimates
- when a developer wants a working proxy, helper layer, and starter routes instead of another one-off OpenRouter rewrite

## Simulated Chats

### Scenario 1: shipping a new model fast

Developer: "A new image-capable model just showed up. I want my agent to add image generation without rewriting the app."

Agent using this skill: "I can fetch the live model catalog, filter by the right modalities and supported parameters, and keep the integration on the same OpenRouter-compatible path."

### Scenario 2: one path for text, vision, and generated images

Developer: "I do not want one SDK for chat, another for images, and a third path for file workflows."

Agent using this skill: "I can keep text, image analysis, image generation, and PDF flows on the same OpenRouter chat-completions layer and reuse the same routing and cost-audit patterns."

### Scenario 3: cost questions after the request

Operator: "Yesterday's workflow cost more than expected. I want the exact generation, provider, and token accounting."

Agent using this skill: "I can look up the completed generation by id and show exact post-hoc cost instead of relying on estimates."

## Repository Layout

```text
.
├── SKILL.md
├── agents/openai.yaml
├── references/
├── scripts/
├── assets/
└── docs/
```

- `SKILL.md`: trigger metadata plus the core OpenRouter workflow
- `agents/openai.yaml`: UI-facing metadata for supported agent skill systems
- `references/`: targeted reference material for image generation, requests, routing, troubleshooting, and docs checks
- `scripts/`: helper scripts for documentation checks and starter installation
- `assets/`: reusable templates, shared helpers, and smoke-test fixtures
- `docs/`: static landing page and search-facing metadata for GitHub Pages

## Included Templates and Helpers

- `assets/nextjs-template/`: API routes and UI components for model browsing, streaming chat, provider catalogs, free-model views, image generation, and generation-cost lookup
- `assets/express-template/`: route handlers and a minimal example server with `/providers`, `/free-models`, `/generation/:id`, and a chat proxy that passes image-generation fields
- `assets/shared/`: TypeScript helpers for response parsing, generated-image extraction, structured output validation, and SSE streaming
- `assets/tests/`: curl-based smoke tests and fixtures for text, JSON, tools, image analysis, image generation, and PDFs
- `assets/shared/openrouter-catalog-and-cost.ts`: reusable helper for models, providers, free models, and generation cost lookup
- `assets/tests/smoke-catalogs.sh`: smoke script for `/models`, `/models/user`, `/providers`, free-model filtering, and `/generation`

## FAQ

### Is this only for one assistant?

No. The repository is packaged as a broad OpenRouter skill for AI agents, and the public naming and install flow are intentionally agent-agnostic.

### Why is the trigger still `openrouter-integration`?

To avoid breaking existing prompts and local installations. The repo branding changed; the skill trigger did not.

### What should I search for?

This project is optimized around the phrases `OpenRouter Skill`, `OpenRouter agent skill`, and `OpenRouter integration skill`.

## Directory Listing

- agentskill.sh: `https://agentskill.sh/@bnishit/openrouter-integration`

## Maintenance

Treat official OpenRouter documentation as the source of truth for endpoints, parameters, and capability metadata.

Use:

```bash
python3 scripts/check_openrouter_docs.py --quick
```

When the script flags drift, update the templates and examples against the relevant OpenRouter documentation.

## License

MIT
