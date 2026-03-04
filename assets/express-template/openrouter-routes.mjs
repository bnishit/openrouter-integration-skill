import express from "express";

export const openrouterRouter = express.Router();

const CACHE_MS = 60 * 60 * 1000;
let cache = null;

function providerFromId(id) {
  return id.split("/")[0] || "unknown";
}

function mapModel(model) {
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

function buildHeaders() {
  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (process.env.OPENROUTER_SITE_URL) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  }

  if (process.env.OPENROUTER_APP_NAME) {
    headers["X-OpenRouter-Title"] = process.env.OPENROUTER_APP_NAME;
  }

  return headers;
}

openrouterRouter.get("/models", async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    const scope = req.query.scope === "user" ? "user" : "all";
    const visionOnly = req.query.visionOnly !== "false";

    if (cache && Date.now() - cache.at < CACHE_MS) {
      const models = visionOnly
        ? cache.models.filter((model) => model.inputModalities.includes("image"))
        : cache.models;
      return res.json({ models, cached: true });
    }

    const endpoint = scope === "user"
      ? "https://openrouter.ai/api/v1/models/user"
      : "https://openrouter.ai/api/v1/models";

    const upstream = await fetch(endpoint, { headers: buildHeaders() });
    const json = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: json?.error || `OpenRouter error ${upstream.status}` });
    }

    const models = (json.data || [])
      .map(mapModel)
      .sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

    cache = { at: Date.now(), models };

    return res.json({
      models: visionOnly ? models.filter((model) => model.inputModalities.includes("image")) : models,
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message, models: [] });
  }
});

openrouterRouter.post("/chat", async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    const {
      model = "openai/gpt-4o-mini",
      models,
      messages,
      response_format,
      provider,
      plugins,
      tools,
      tool_choice,
      parallel_tool_calls,
      temperature = 0,
      stream = false,
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages is required" });
    }

    const payload = {
      model,
      ...(Array.isArray(models) && models.length ? { models } : {}),
      messages,
      ...(response_format ? { response_format } : {}),
      ...(provider ? { provider } : {}),
      ...(plugins ? { plugins } : {}),
      ...(tools ? { tools } : {}),
      ...(tool_choice ? { tool_choice } : {}),
      ...(typeof parallel_tool_calls === "boolean" ? { parallel_tool_calls } : {}),
      temperature,
      stream,
    };

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });

    if (stream) {
      res.status(upstream.status);
      res.setHeader("Content-Type", upstream.headers.get("content-type") || "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      if (upstream.body) {
        for await (const chunk of upstream.body) {
          res.write(chunk);
        }
      }
      return res.end();
    }

    const json = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: json?.error || `OpenRouter error ${upstream.status}` });
    }

    return res.json({
      id: json.id,
      model: json.model,
      choices: json.choices || [],
      usage: json.usage || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});
