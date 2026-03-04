import type { OpenRouterChatResponse } from "./parse-openrouter-response";
import { getAssistantText } from "./parse-openrouter-response";

export type OpenRouterSseEvent = {
  type: "message" | "done";
  data: OpenRouterChatResponse | null;
  raw: string;
};

function parseSseFrame(frame: string): OpenRouterSseEvent | null {
  const lines = frame
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith(":"));

  if (lines.length === 0) return null;

  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");

  if (!data) return null;
  if (data === "[DONE]") {
    return { type: "done", data: null, raw: frame };
  }

  return {
    type: "message",
    data: JSON.parse(data) as OpenRouterChatResponse,
    raw: frame,
  };
}

export async function* parseOpenRouterSse(response: Response): AsyncGenerator<OpenRouterSseEvent> {
  if (!response.body) {
    throw new Error("Response body is missing");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";

    for (const frame of frames) {
      const event = parseSseFrame(frame);
      if (event) yield event;
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const event = parseSseFrame(buffer);
    if (event) yield event;
  }
}

export async function collectStreamText(response: Response): Promise<string> {
  let text = "";
  for await (const event of parseOpenRouterSse(response)) {
    if (event.type === "message" && event.data) {
      text += getAssistantText(event.data);
    }
  }
  return text;
}
