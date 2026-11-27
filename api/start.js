import { AGENTS, getClient, send, validateTask, taskParams } from "./_shared.js";

async function closeSession(client, sessionId) {
  if (!client?.sessions?.stop || !sessionId) return;
  try { await client.sessions.stop(sessionId); } catch {}
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  let client = null;
  let session = null;
  try {
    const input = validateTask(req.body);
    client = getClient(req.body.apiKey);
    const agent = client.agents[AGENTS[input.agent]];
    if (!agent || typeof agent.start !== "function") {
      return send(res, 400, { error: "Agent ini tidak tersedia pada SDK Hyperbrowser yang digunakan." });
    }

    // CUA may return a null liveUrl when it creates its own internal session.
    // Create an explicit session so the monitor always has a live view URL.
    if (input.agent === "cua") session = await client.sessions.create();
    const params = taskParams(input, req.body);
    if (session?.id) {
      params.sessionId = session.id;
      params.keepBrowserOpen = true;
    }

    const started = await agent.start(params);
    if (!started?.jobId) {
      await closeSession(client, session?.id);
      return send(res, 502, { error: "Hyperbrowser tidak mengembalikan jobId.", details: started ?? null });
    }
    return send(res, 200, {
      ok: true,
      jobId: started.jobId,
      liveUrl: started.liveUrl || session?.liveUrl || null,
      sessionId: session?.id ?? null,
      agent: input.agent,
      startedAt: new Date().toISOString()
    });
  } catch (error) {
    await closeSession(client, session?.id);
    const message = String(error?.message || error).slice(0, 1200);
    return send(res, 400, { error: message });
  }
}
