import { AGENTS, getClient, send } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const { apiKey, agent, jobId, sessionId } = req.body || {};
    if (!AGENTS[agent]) return send(res, 400, { error: "Agent tidak didukung." });
    if (typeof jobId !== "string" || !jobId.trim() || jobId.length > 300) {
      return send(res, 400, { error: "Job ID tidak valid." });
    }
    if (sessionId != null && (typeof sessionId !== "string" || sessionId.length > 300)) {
      return send(res, 400, { error: "Session ID tidak valid." });
    }
    const client = getClient(apiKey);
    const service = client.agents[AGENTS[agent]];
    if (!service || typeof service.getStatus !== "function" || typeof service.get !== "function") {
      return send(res, 400, { error: "Status/result endpoint tidak tersedia untuk agent ini." });
    }
    const status = await service.getStatus(jobId);
    const normalized = String(status?.status || "unknown").toLowerCase();
    if (["completed", "failed", "cancelled", "canceled"].includes(normalized)) {
      const result = await service.get(jobId);
      if (sessionId && client.sessions?.stop) {
        try { await client.sessions.stop(sessionId); } catch {}
      }
      return send(res, 200, {
        ok: true,
        terminal: true,
        status: normalized === "completed" ? "success" : "failed",
        output: result?.data?.finalResult ?? result?.data?.final_result ?? null,
        error: result?.error?.message ?? result?.error ?? null,
        rawStatus: normalized,
        steps: result?.data?.steps?.length ?? null,
        finishedAt: new Date().toISOString()
      });
    }
    return send(res, 200, { ok: true, terminal: false, status: normalized });
  } catch (error) {
    const message = String(error?.message || error).slice(0, 1200);
    return send(res, 400, { error: message });
  }
}
