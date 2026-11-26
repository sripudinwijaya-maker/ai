import { Hyperbrowser } from "@hyperbrowser/sdk";

export const AGENTS = {
  "hyperAgent": "hyperAgent",
  "browserUse": "browserUse",
  "cua": "cua",
  "claudeComputerUse": "claudeComputerUse",
  "geminiComputerUse": "geminiComputerUse",
  "metaComputerUse": "metaComputerUse",
  "grokComputerUse": "grokComputerUse",
  "jevComputerUse": "jevComputerUse"
};

export function send(res, status, data) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.json(data);
}

export function getClient(apiKey) {
  if (typeof apiKey !== "string" || !apiKey.trim() || apiKey.length > 500) {
    throw new Error("Hyperbrowser API key tidak valid.");
  }
  return new Hyperbrowser({ apiKey: apiKey.trim() });
}

export function validateTask(body) {
  if (!body || typeof body.task !== "string" || !body.task.trim() || body.task.length > 12000) {
    throw new Error("Prompt wajib diisi (maksimal 12.000 karakter).");
  }
  if (!AGENTS[body.agent]) throw new Error("Agent tidak didukung.");
  const maxSteps = Number(body.maxSteps ?? 50);
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 100) {
    throw new Error("Max steps harus antara 1–100.");
  }
  return { task: body.task.trim(), agent: body.agent, maxSteps };
}

export function taskParams(input, body) {
  const params = {
    task: input.task,
    maxSteps: input.maxSteps
  };
  const llm = typeof body.llm === "string" ? body.llm.trim() : "";
  if (llm) params.llm = llm;
  if (input.agent === "cua") {
    params.useComputerAction = true;
    const allowed = ["low", "medium", "high", "xhigh", "max"];
    const effort = allowed.includes(body.reasoningEffort) ? body.reasoningEffort : "medium";
    params.reasoningEffort = effort;
  }
  return params;
}