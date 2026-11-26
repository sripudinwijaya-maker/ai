import { AGENTS, getClient, send, validateTask, taskParams } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const input = validateTask(req.body);
    const client = getClient(req.body.apiKey);
    const agent = client.agents[AGENTS[input.agent]];
    if (!agent || typeof agent.start !== "function") {
      return send(res, 400, { error: "Agent ini tidak tersedia pada SDK Hyperbrowser yang digunakan." });
    }
    const started = await agent.start(taskParams(input, req.body));
    if (!started?.jobId) {
      return send(res, 502, { error: "Hyperbrowser tidak mengembalikan jobId.", details: started ?? null });
    }
    return send(res, 200, {
      ok: true,
      jobId: started.jobId,
      liveUrl: started.liveUrl ?? null,
      agent: input.agent,
      startedAt: new Date().toISOString()
    });
  } catch (error) {
    const message = String(error?.message || error).slice(0, 1200);
    return send(res, 400, { error: message });
  }
}