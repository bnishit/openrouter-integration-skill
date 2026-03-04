# Routing And Fallbacks

## Model Routing Options

OpenRouter supports several routing patterns:

1. Single fixed model with OpenRouter-managed provider routing.
2. `models` array for model-level fallback in priority order.
3. `model: "openrouter/auto"` when you want OpenRouter to choose among high-quality models dynamically.
4. `provider` object when you want to constrain or sort providers for a given model.

## Model Fallbacks

Use the `models` parameter to fail over across model ids.

```json
{
  "model": "openai/gpt-4o-mini",
  "models": [
    "google/gemini-2.5-flash",
    "anthropic/claude-3.5-haiku"
  ],
  "messages": [
    { "role": "user", "content": "Extract the invoice total." }
  ],
  "temperature": 0
}
```

Behavior from OpenRouter docs:

- The primary `model` is tried first.
- The `models` array is attempted in order if the primary model fails.
- Fallbacks can trigger on downtime, rate limits, moderation refusal, or validation errors.
- The response `model` field tells you which model ultimately served the request.

## Auto Router

Use `model: "openrouter/auto"` when you want OpenRouter to route across selected high-quality models for a prompt.

```json
{
  "model": "openrouter/auto",
  "messages": [
    { "role": "user", "content": "Summarize the attached invoice." }
  ]
}
```

This is useful for general chat UX. It is less appropriate when you need strict determinism, audited benchmarking, or per-model UI reporting.

## Provider Routing

Use the `provider` object when the model id is fixed but provider choice matters.

```json
{
  "model": "meta-llama/llama-3.1-8b-instruct",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "provider": {
    "order": ["deepinfra", "together"],
    "allow_fallbacks": true,
    "require_parameters": true,
    "data_collection": "deny",
    "sort": "throughput",
    "max_price": {
      "prompt": 1,
      "completion": 2
    }
  }
}
```

Common fields from the docs:

- `order`: provider priority list.
- `allow_fallbacks`: allow backup providers for the same model.
- `require_parameters`: only route to providers supporting every requested parameter.
- `data_collection`: allow or deny providers that may store data.
- `zdr`: require zero-data-retention endpoints when available.
- `only` / `ignore`: explicit provider allow or deny lists.
- `sort`: price or throughput based sorting.
- `max_price`: cap acceptable provider pricing.

## Practical Policies

### Lowest latency extraction

- Use a cheap, fast model as `model`.
- Add one stronger fallback in `models`.
- Use `provider.sort: "throughput"` if the model has many providers.
- Keep `temperature: 0`.

### Highest reliability OCR

- Prefer a vision-capable primary model proven on your documents.
- Add one or two fallbacks with similar multimodal support.
- Use `provider.require_parameters: true` when you depend on `response_format`, tools, or plugins.
- Log the final response `model` so you can see when fallbacks are carrying the workload.

### Privacy-sensitive workflows

- Use `provider.data_collection: "deny"`.
- Add `provider.zdr: true` when required and supported.
- Use `/api/v1/models/user` if the account already encodes privacy guardrails.

### Cost-capped routing

- Use `provider.max_price` with prompt, completion, request, or image caps.
- Pair it with `provider.sort: "price"` when cost matters more than throughput.

## UI Guidance

- Show both the requested model and the resolved response model when fallbacks are enabled.
- If the UI presents model choices, make fallbacks an advanced section rather than the default surface.
- When benchmarking models, disable model-level fallbacks or record fallback events explicitly so results remain interpretable.
- When provider constraints block a request, surface the actual OpenRouter error to the user instead of collapsing it to a generic failure.
