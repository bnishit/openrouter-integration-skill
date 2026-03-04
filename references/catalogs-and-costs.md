# Catalogs, Providers, And Costs

## Endpoints

- `GET https://openrouter.ai/api/v1/models`: full model catalog.
- `GET https://openrouter.ai/api/v1/models/user`: caller-aware model catalog shaped by account and provider preferences.
- `GET https://openrouter.ai/api/v1/providers`: provider catalog for routing, ordering, privacy, and availability-aware UIs.
- `GET https://openrouter.ai/api/v1/generation?id=<generation_id>`: fetch one completed generation with cost and token accounting details.

## Common Headers

Use:

```http
Authorization: Bearer <OPENROUTER_API_KEY>
Accept: application/json
HTTP-Referer: <your-site-url>
X-OpenRouter-Title: <your-app-name>
```

`HTTP-Referer` and `X-OpenRouter-Title` are especially useful when the request originates from a real app and you want leaderboard attribution or cleaner observability.

## Models

Use `/api/v1/models` when you need the broadest model list for search, filtering, and capability discovery.

Keep these fields:

- `id`
- `name`
- `description`
- `context_length`
- `architecture.input_modalities`
- `architecture.output_modalities`
- `supported_parameters`
- `pricing`
- `top_provider`

Store `id`, not `name`.

## User Models

Use `/api/v1/models/user` when the app should respect the caller's configured provider choices and account-specific filtering. This is better than `/models` when the UI should only show models the current account can actually route to.

## Providers

Use `/api/v1/providers` when you need a provider picker, provider status data, or routing-aware UI copy. This is the right place to build:

- provider filter chips
- privacy or logging preference toggles
- ordered provider fallback configuration
- pricing or max-price controls that are provider-sensitive

Prefer storing provider identifiers from the API instead of inventing your own provider enum.

## Free Models

There is no separate "free models list" endpoint to rely on in the skill. The robust approach is:

1. fetch `/api/v1/models`
2. treat pricing values as strings
3. keep models whose relevant price fields are zero-valued strings

Pragmatic filter:

```ts
const freeModels = models.filter((model) => {
  const pricing = model.pricing ?? {};
  return ["prompt", "completion", "request", "image"].every((key) => {
    const value = pricing[key];
    return value == null || value === "0";
  });
});
```

OpenRouter also documents shortcuts such as `openrouter/free`, but for searchable UIs and audits, filter the catalog directly.

## Generation Lookup

When a completed generation matters for billing, analytics, or debugging, save the response `id` from the original completion and fetch it later:

```bash
curl -s "https://openrouter.ai/api/v1/generation?id=$GENERATION_ID" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Accept: application/json"
```

Fields worth logging when available:

- `id`
- `model`
- `provider_name`
- `tokens_prompt`
- `tokens_completion`
- `native_tokens_prompt`
- `native_tokens_completion`
- `total_cost`
- `created_at`
- `upstream_id`

Use the original completion response for fast inline UX, and `/generation` for delayed audit, billing inspection, or support workflows.

## Cost Handling Rules

- Persist the generation id whenever cost history matters.
- Treat pricing fields from catalog endpoints as strings and convert deliberately.
- Treat per-request `usage.cost` as the fast path and `/generation` as the audit path.
- Log both normalized token counts and native token counts when comparing providers.
- Do not estimate price client-side when the exact generation record is available.

## UI Suggestions

- Add a "Free" filter based on zero-priced catalog entries.
- Show provider badges separately from model ids.
- Expose a "View generation cost" action anywhere you surface past completions.
- Store recent generation ids alongside message history for later audit or support tooling.
