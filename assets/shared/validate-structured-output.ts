// Requires the `zod` package in the target project.
import { z, type ZodTypeAny } from "zod";
import type { OpenRouterChatResponse } from "./parse-openrouter-response";
import { getAssistantText } from "./parse-openrouter-response";

export function parseStructuredOutput<TSchema extends ZodTypeAny>(
  schema: TSchema,
  content: unknown
): z.infer<TSchema> {
  const raw = typeof content === "string" ? content : JSON.stringify(content);
  const parsed = JSON.parse(raw);
  return schema.parse(parsed);
}

export function parseStructuredChoice<TSchema extends ZodTypeAny>(
  schema: TSchema,
  response: OpenRouterChatResponse
): z.infer<TSchema> {
  const text = getAssistantText(response).trim();
  if (!text) {
    throw new Error("Assistant returned empty content; nothing to validate");
  }
  return parseStructuredOutput(schema, text);
}

export function safeParseStructuredChoice<TSchema extends ZodTypeAny>(
  schema: TSchema,
  response: OpenRouterChatResponse
) {
  const text = getAssistantText(response).trim();
  if (!text) {
    return {
      success: false as const,
      error: new Error("Assistant returned empty content; nothing to validate"),
    };
  }

  try {
    const parsed = JSON.parse(text);
    return schema.safeParse(parsed);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error : new Error("Invalid JSON"),
    };
  }
}
