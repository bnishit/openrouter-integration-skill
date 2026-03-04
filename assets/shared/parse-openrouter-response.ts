export type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
};

export type OpenRouterToolCall = {
  id: string;
  type: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

export type OpenRouterChoice = {
  finish_reason?: string | null;
  native_finish_reason?: string | null;
  delta?: {
    content?: unknown;
    tool_calls?: OpenRouterToolCall[];
  };
  message?: {
    role?: string;
    content?: unknown;
    tool_calls?: OpenRouterToolCall[];
  };
};

export type OpenRouterChatResponse = {
  id?: string;
  model?: string;
  choices?: OpenRouterChoice[];
  usage?: OpenRouterUsage;
};

export function flattenAssistantContent(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content);

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      const typedPart = part as { type?: string; text?: unknown };
      if (typeof typedPart.text === "string") return typedPart.text;
      if (typedPart.type === "output_text" && typeof typedPart.text === "string") {
        return typedPart.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function getFirstChoice(response: OpenRouterChatResponse): OpenRouterChoice | null {
  return response.choices?.[0] || null;
}

export function getAssistantText(response: OpenRouterChatResponse): string {
  const choice = getFirstChoice(response);
  if (!choice) return "";
  return flattenAssistantContent(choice.message?.content ?? choice.delta?.content);
}

export function getToolCalls(response: OpenRouterChatResponse): OpenRouterToolCall[] {
  const choice = getFirstChoice(response);
  if (!choice) return [];
  return choice.message?.tool_calls || choice.delta?.tool_calls || [];
}

export function parseToolArguments<T>(toolCall: OpenRouterToolCall): T {
  const raw = toolCall.function?.arguments || "{}";
  return JSON.parse(raw) as T;
}

export function summarizeResponse(response: OpenRouterChatResponse) {
  const choice = getFirstChoice(response);
  return {
    id: response.id || null,
    model: response.model || null,
    text: getAssistantText(response),
    toolCalls: getToolCalls(response),
    finishReason: choice?.finish_reason ?? null,
    nativeFinishReason: choice?.native_finish_reason ?? null,
    usage: response.usage || null,
  };
}
