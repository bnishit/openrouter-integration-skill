import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_MS = 60 * 60 * 1000;

type OpenRouterModel = {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    image?: string;
    request?: string;
  };
  supported_parameters?: string[];
};

type UiModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextLength: number;
  inputModalities: string[];
  outputModalities: string[];
  supportedParameters: string[];
  pricing: {
    prompt: string;
    completion: string;
    image: string;
    request: string;
  };
};

let cache: { at: number; models: UiModel[] } | null = null;

function providerFromId(id: string) {
  return id.split("/")[0] || "unknown";
}

function mapModel(model: OpenRouterModel): UiModel {
  return {
    id: model.id,
    name: model.name || model.id,
    provider: providerFromId(model.id),
    description: model.description || "",
    contextLength: model.context_length || 0,
    inputModalities: model.architecture?.input_modalities || [],
    outputModalities: model.architecture?.output_modalities || [],
    supportedParameters: model.supported_parameters || [],
    pricing: {
      prompt: model.pricing?.prompt || "0",
      completion: model.pricing?.completion || "0",
      image: model.pricing?.image || "0",
      request: model.pricing?.request || "0",
    },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") === "user" ? "user" : "all";
    const visionOnly = searchParams.get("visionOnly") !== "false";

    if (cache && Date.now() - cache.at < CACHE_MS) {
      const models = visionOnly
        ? cache.models.filter((model) => model.inputModalities.includes("image"))
        : cache.models;

      return NextResponse.json({ models, cached: true });
    }

    const endpoint =
      scope === "user"
        ? "https://openrouter.ai/api/v1/models/user"
        : "https://openrouter.ai/api/v1/models";

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    };

    if (process.env.OPENROUTER_SITE_URL) {
      headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
    }

    if (process.env.OPENROUTER_APP_NAME) {
      headers["X-OpenRouter-Title"] = process.env.OPENROUTER_APP_NAME;
    }

    const res = await fetch(endpoint, { headers, cache: "no-store" });
    const json = (await res.json()) as { data?: OpenRouterModel[]; error?: unknown };

    if (!res.ok) {
      return NextResponse.json(
        { error: json.error || `OpenRouter error ${res.status}` },
        { status: res.status }
      );
    }

    const models = (json.data || [])
      .map(mapModel)
      .sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

    cache = { at: Date.now(), models };

    return NextResponse.json({
      models: visionOnly ? models.filter((model) => model.inputModalities.includes("image")) : models,
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, models: [] }, { status: 500 });
  }
}
