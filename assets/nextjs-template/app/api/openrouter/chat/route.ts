import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ProxyBody = {
  model?: string;
  models?: string[];
  messages?: unknown[];
  modalities?: string[];
  image_config?: unknown;
  response_format?: unknown;
  provider?: unknown;
  plugins?: unknown;
  tools?: unknown;
  tool_choice?: unknown;
  parallel_tool_calls?: boolean;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Missing OPENROUTER_API_KEY" }, { status: 500 });
    }

    const body = (await req.json()) as ProxyBody;

    if (!body.messages?.length) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    const payload = {
      model: body.model || "openai/gpt-4o-mini",
      ...(body.models?.length ? { models: body.models } : {}),
      messages: body.messages,
      ...(body.modalities?.length ? { modalities: body.modalities } : {}),
      ...(body.image_config ? { image_config: body.image_config } : {}),
      ...(body.response_format ? { response_format: body.response_format } : {}),
      ...(body.provider ? { provider: body.provider } : {}),
      ...(body.plugins ? { plugins: body.plugins } : {}),
      ...(body.tools ? { tools: body.tools } : {}),
      ...(body.tool_choice ? { tool_choice: body.tool_choice } : {}),
      ...(typeof body.parallel_tool_calls === "boolean"
        ? { parallel_tool_calls: body.parallel_tool_calls }
        : {}),
      ...(typeof body.max_tokens === "number" ? { max_tokens: body.max_tokens } : {}),
      temperature: body.temperature ?? 0,
      stream: body.stream ?? false,
    };

    const headers: Record<string, string> = {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    };

    if (process.env.OPENROUTER_SITE_URL) {
      headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
    }

    if (process.env.OPENROUTER_APP_NAME) {
      headers["X-OpenRouter-Title"] = process.env.OPENROUTER_APP_NAME;
    }

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (payload.stream) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") || "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    }

    const json = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(
        { error: json?.error || `OpenRouter error ${upstream.status}` },
        { status: upstream.status }
      );
    }

    return NextResponse.json({
      id: json.id,
      model: json.model,
      choices: json.choices || [],
      usage: json.usage || null,
      data: json.data || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
