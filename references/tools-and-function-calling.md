# Tools And Function Calling

## When To Use Tools

Use tool calling when the model must fetch live data, execute deterministic business logic, or act through an external system. Do not use tools for work that should stay in the prompt, such as simple formatting or summarization.

Before enabling tool use, check the model's `supported_parameters` and prefer providers that support tools fully.

## Core Request Shape

Tool calling still uses `POST https://openrouter.ai/api/v1/chat/completions`.

Send a `tools` array and optionally `tool_choice` or `parallel_tool_calls`.

```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": "Look up today's weather in San Francisco and summarize it."
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get current weather by city name",
        "parameters": {
          "type": "object",
          "properties": {
            "city": { "type": "string" }
          },
          "required": ["city"],
          "additionalProperties": false
        }
      }
    }
  ],
  "tool_choice": "auto",
  "parallel_tool_calls": false
}
```

## Three-Step Loop

1. Send user and system messages plus the `tools` array.
2. Inspect the assistant message for `tool_calls`.
3. Execute the tool, append a `tool` role message, and send another chat completion request with the full conversation and the same `tools` array.

Do not drop the `tools` array on the second call. OpenRouter docs explicitly note that tools must remain present on every request in the loop.

## Tool Call Response Shape

When the model wants a tool, the assistant message typically looks like:

```json
{
  "role": "assistant",
  "content": "",
  "tool_calls": [
    {
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "get_weather",
        "arguments": "{\"city\":\"San Francisco\"}"
      }
    }
  ]
}
```

Expect `finish_reason` or `native_finish_reason` to indicate tool use.

## Tool Result Message

Return tool results as a `tool` role message tied to the tool call id.

```json
{
  "role": "tool",
  "tool_call_id": "call_123",
  "content": "{\"city\":\"San Francisco\",\"temp_f\":63,\"condition\":\"Sunny\"}"
}
```

`content` should be a string. Use JSON stringification for structured results.

## Full Follow-Up Request

```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": "Look up today's weather in San Francisco and summarize it."
    },
    {
      "role": "assistant",
      "content": "",
      "tool_calls": [
        {
          "id": "call_123",
          "type": "function",
          "function": {
            "name": "get_weather",
            "arguments": "{\"city\":\"San Francisco\"}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_123",
      "content": "{\"city\":\"San Francisco\",\"temp_f\":63,\"condition\":\"Sunny\"}"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get current weather by city name",
        "parameters": {
          "type": "object",
          "properties": {
            "city": { "type": "string" }
          },
          "required": ["city"],
          "additionalProperties": false
        }
      }
    }
  ]
}
```

## Practical Rules

- Keep function names stable and machine-friendly.
- Write tight schemas with `additionalProperties: false`.
- Parse `function.arguments` as JSON and validate before executing.
- If the request depends on tools, prefer `provider.require_parameters: true`.
- Use `parallel_tool_calls: false` unless you really want concurrency.
- Surface tool failures back to the model as structured tool output instead of dropping them.
- Log both the requested tool name and the validated arguments.

## Common Failure Modes

- Sending `tools` only on the first request.
- Forgetting `tool_call_id` on the tool result message.
- Returning raw objects instead of string content.
- Letting invalid arguments reach the real tool.
- Assuming every provider for a model supports tools equally.

## Suggested Loop Structure

- Validate arguments with a schema before executing the tool.
- Impose timeouts and retries on the tool implementation, not on the model request alone.
- Cap the number of tool turns to avoid runaway loops.
- On the final answer, log the resolved response model because fallbacks can change which provider or model actually answered.
