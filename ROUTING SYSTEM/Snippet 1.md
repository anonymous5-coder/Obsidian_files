# Top_Models Router — Hybrid Plan (Phase A/B/C)

## CONTEXT
The user owns Top_Models (github.com/anonymous5-coder/Top_Models), a ranked matrix dashboard + Node.js CLI + PWA + Capacitor Android app that:
- Fetches live OpenRouter catalog, filters free models (21-25)
- Displays 6 ranked columns: Context, Thinking, Coding, Agentic, Summarizer, Refusal Rates
- Has per-cell Extend/Collapse showing Modalities, Uptime, Latency
- Uses LLM estimates for refusal rates via openrouter/free
- CLI: models keys|refresh|estimate|fetch
- Deployed as PWA on GitHub Pages + Android APK built via GitHub Actions
- Built entirely on an 8GB Android phone (Termux + agy-termux)

The user wants task-aware routing with automatic fallback across providers. To avoid rebuilding infrastructure, we use an existing battle-tested routing engine underneath, and keep Top_Models as the intelligence layer on top.

## ARCHITECTURE (3 LAYERS)

Layer 1: Routing Engine (USE EXISTING TOOL)
- Use `ai-router` by mohamedjaha (Python, BYOK, CLI-first, local-only).
- It already handles: provider abstraction, health tracking, quota tracking, circuit-breaking, and automatic failover across Groq / Cerebras / Mistral / Gemini / Cloudflare.
- It exposes an OpenAI-compatible HTTP server via `ai-router serve`.
- Why: battle-tested, avoids rebuilding infrastructure that already exists.
- Risk: external repo could be abandoned. Mitigation: the ProviderAdapter interface from the Full Scratch plan is our fallback path if ai-router ever breaks.

Layer 2: Intelligence Layer (KEEP Top_Models)
- The existing ranked matrix is the task-profile source.
- Task profile column mappings:
  - bestCoding()      -> Coding column
  - bestAgentic()     -> Agentic column
  - bestLongContext() -> Context column
  - bestRE()          -> Coding + Refusal (lower is better) + Agentic (weighted)
- Add command: models best <task>  (returns top 3 for any profile)

Layer 3: Integration (THIN GLUE)
- New command: models route "<prompt>"  [--json]
- Step 1: Classify task via keyword rules:
  - Reverse Engineering: ARM64, Ghidra, JNI, IL2CPP, Frida, binary, DEX, SO
  - Coding: Python, function, debug, refactor, code
  - General: explain, summarize, compare
- Step 2: Look up best model for that task from the ranked matrix.
- Step 3: Send the request to `ai-router serve` with the preferred model.
- Step 4: On 429/refusal/timeout, fall back to the next best model for that task (max 3 attempts total, then stop).

## ROUTE REGISTRY SCHEMA
Even though ai-router handles the actual routing, we maintain a thin local cache of route metadata for display and debugging:
  {
    "route_id": "groq/openai/gpt-oss-120b",
    "provider": "groq",
    "model": "openai/gpt-oss-120b",
    "endpoint": "https://api.groq.com/openai/v1",
    "capabilities": { "coding": 82, "agentic": 74, "context": 131072 },
    "live": { "health": 0.98, "latency_ms": 420, "quota_remaining": 982 }
  }

## FUNCTIONAL REQUIREMENTS
1. Task classification: keyword-based only (no ML).
2. Refusal handling: max 3 attempts total, then stop.
3. Cooldowns: 429 = 60s; 401/403 = disabled until manual reset; timeout/5xx = 30s.
4. Task profiles: separate scoring for coding, RE, agentic, long context, vision.
5. models route --json returns machine-readable primary + fallbacks.
6. Do NOT put provider keys in the PWA. CLI is the privileged router.

## PHASES
Phase A (week 1):
1. Install ai-router in Termux.
2. Configure Groq + Google Gemini API keys.
3. Test standalone: ai-router chat, verify failover.
4. Add models best <task> command using the existing ranked matrix (no router integration yet).

Phase B (week 2):
5. Add models route <task> command (info-only output).
6. Add keyword task classification.
7. Wire models route to ai-router serve.
8. Implement --json output flag.
9. Add cooldown/refusal retry logic (max 3 attempts).
10. Test failover: Groq 429 -> Google -> stop.

Phase C (only if A+B are solid):
11. Add Cerebras + Mistral via ai-router config.
12. Add a simplified 10-prompt empirical refusal test (not the full 50-prompt benchmark).
13. Add local llama.cpp as final fallback via OpenAI-compatible endpoint.
14. Activate the Full Scratch ProviderAdapter as a hot-swap backup if ai-router breaks.

## DO NOT DO
- Do NOT build a provider abstraction from scratch while ai-router exists.
- Do NOT implement 8 provider adapters at once. Start with 2.
- Do NOT build the full 50-prompt empirical benchmark yet.
- Do NOT call it an "AI Inference Operating System".
- Do NOT put all provider keys in the PWA.
- Do NOT modify the core Ranked Matrix sorting logic, the 9-column DOM structure, or the Uptime/Latency parsing.