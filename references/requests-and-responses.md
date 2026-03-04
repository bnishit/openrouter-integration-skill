# Requests And Responses

## Core Endpoint

Use `POST https://openrouter.ai/api/v1/chat/completions`.

OpenRouter uses an OpenAI-compatible chat schema with OpenRouter-specific extensions such as `plugins`, `models`, `provider`, `transforms`, and extra usage metadata.

## Common Headers

```http
Authorization: Bearer <OPENROUTER_API_KEY>
Content-Type: application/json
HTTP-Referer: <your-site-url>
X-OpenRouter-Title: <your-app-name>
```

`X-Title` is still accepted, but the current docs prefer `X-OpenRouter-Title`.

## Text-Only Request

```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [
    { "role": "system", "content": "You are a concise assistant." },
    { "role": "user", "content": "Summarize this invoice in 3 bullets." }
  ],
  "temperature": 0
}
```

## Image Request

For image analysis, send a user message with a content array. Put the text part before the image parts.

```json
{
  "model": "google/gemini-2.5-flash",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Extract all text from this image." },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/png;base64,<base64>"
          }
        }
      ]
    }
  ]
}
```

Use a public URL instead of a data URL when the image is already publicly accessible.

## Image Generation Request

For image generation, keep using the chat completions endpoint but request image output explicitly with `modalities`. Many image-capable models also accept `image_config` for output settings such as size.

```json
{
  "model": "openai/gpt-image-1",
  "messages": [
    {
      "role": "user",
      "content": "Generate a clean product illustration of a glass teacup on a plain background."
    }
  ],
  "modalities": ["image", "text"],
  "image_config": {
    "size": "1024x1024"
  }
}
```

Keep `messages` in the normal OpenAI-compatible format. The key difference is that image-output requests should advertise the desired output modality instead of assuming text-only output.

## PDF Request

For PDFs, use a `file` content part. The file may be a public URL or a data URL.

```json
{
  "model": "google/gemini-2.5-flash",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Extract the invoice header and line items." },
        {
          "type": "file",
          "file": {
            "filename": "invoice.pdf",
            "file_data": "data:application/pdf;base64,<base64>"
          }
        }
      ]
    }
  ],
  "plugins": [
    {
      "id": "file-parser",
      "pdf": { "engine": "pdf-text" }
    }
  ]
}
```

For public PDFs, `file_data` may be a URL. When the selected model supports file input natively, OpenRouter can pass the file directly; otherwise OpenRouter parses it and forwards parsed content to the model.

## PDF Engine Guidance

- `pdf-text`: prefer for clean digital PDFs with extractable text; free.
- `mistral-ocr`: prefer for scanned or image-heavy PDFs; paid.
- `native`: use only when the chosen model supports file input natively.

If you do not specify an engine, OpenRouter defaults first to the model's native file processing when available and otherwise falls back to `mistral-ocr`.

## Reusing PDF Annotations

When a PDF is parsed, the assistant message may include `annotations`. Reuse them on follow-up requests to skip reparsing:

```json
[
  {
    "role": "user",
    "content": [
      { "type": "text", "text": "Summarize this PDF." },
      {
        "type": "file",
        "file": {
          "filename": "invoice.pdf",
          "file_data": "data:application/pdf;base64,<base64>"
        }
      }
    ]
  },
  {
    "role": "assistant",
    "content": "Previous answer",
    "annotations": [
      { "type": "file", "file": { "hash": "...", "content": [] } }
    ]
  },
  {
    "role": "user",
    "content": "Now extract all totals as JSON."
  }
]
```

## Structured Output

Use `response_format` when the app needs machine-readable output.

Basic JSON mode:

```json
{
  "response_format": { "type": "json_object" }
}
```

Strict schema mode:

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "invoice_extract",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "invoice_number": { "type": "string" },
          "total": { "type": "number" }
        },
        "required": ["invoice_number", "total"],
        "additionalProperties": false
      }
    }
  }
}
```

Prefer `json_schema` when the model advertises `structured_outputs`. Fall back to `json_object` otherwise.

## Streaming Notes

- OpenRouter streams via SSE.
- Ignore comment lines that start with `:`.
- Expect a terminal `[DONE]` marker.
- Expect the final chunk to include aggregated usage data exactly once when usage information is available.
- A stream can still represent an error case even if the initial HTTP status was `200`; parse the whole stream.

## Response Shape

Non-streaming responses are normalized around:

```json
{
  "id": "gen-...",
  "choices": [
    {
      "finish_reason": "stop",
      "native_finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": "..."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 20,
    "total_tokens": 120,
    "cost": 0.00014
  },
  "model": "openai/gpt-4o-mini"
}
```

Save the top-level `id` when the app needs later audit, billing, or support lookup. That id is what `/api/v1/generation` expects.

For image-generation responses, the first assistant message may also include an `images` array. Expect image URLs on `choices[0].message.images[*].image_url.url` when the provider returns generated assets inline with the completion.

## Generation Lookup And Cost Audit

Use the original completion response for immediate UX, then use the generation endpoint for exact post-hoc accounting:

```bash
curl -s "https://openrouter.ai/api/v1/generation?id=$GENERATION_ID" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Accept: application/json"
```

Typical fields worth logging when available:

- `total_cost`
- `tokens_prompt`
- `tokens_completion`
- `native_tokens_prompt`
- `native_tokens_completion`
- `provider_name`
- `upstream_id`
- `created_at`

## Parsing Rules

- Read `choices[0]` first, but do not assume only one choice exists.
- For non-streaming responses, read `choices[0].message.content`.
- For image generation, also inspect `choices[0].message.images` for generated assets.
- Some providers or SDK layers may return `message.content` as arrays of typed chunks; flatten them if needed.
- For streaming responses, accumulate `choices[0].delta.content` across chunks and watch for `choices[0].delta.images` on image-capable models.
- Ignore SSE comment frames when streaming.
- Check `finish_reason` and `native_finish_reason` when diagnosing truncation or provider behavior.
- Log `usage`, including `cost`, for observability.
- Persist the generation `id` if exact later cost lookup matters.
- Handle provider errors from non-2xx responses and also from streamed or embedded error objects when present.

## Common Integration Choices

- Server proxy route: preferred for browser apps.
- `temperature: 0`: preferred for extraction, OCR, and deterministic transforms.
- `stream: true`: preferred for chat UIs; not usually needed for extraction pipelines.
- `tools`: only send when the chosen model advertises tool support.
- `models`: useful when you want model-level fallbacks.
- `provider`: useful when you want provider-level ordering, privacy rules, or max-price constraints.
- `plugins`: use for PDF parsing or response healing when those features materially help the workflow.
