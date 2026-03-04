import express from "express";
import { openrouterRouter } from "./openrouter-routes.mjs";

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use("/api/openrouter", openrouterRouter);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`OpenRouter proxy listening on http://localhost:${port}`);
});
