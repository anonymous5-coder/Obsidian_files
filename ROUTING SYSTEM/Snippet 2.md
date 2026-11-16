# Top_Models Router — Full Scratch Plan (Phase A/B/C)

## CONTEXT
The user owns Top_Models (github.com/anonymous5-coder/Top_Models), a ranked matrix dashboard + Node.js CLI + PWA + Capacitor Android app that:
- Fetches live OpenRouter catalog, filters free models (21-25)
- Displays 6 ranked columns: Context, Thinking, Coding, Agentic, Summarizer, Refusal Rates
- Has per-cell Extend/Collapse showing Modalities, Uptime, Latency
- Uses LLM estimates for refusal rates via openrouter/free
- CLI: models keys|refresh|estimate|fetch
- Deployed as PWA on GitHub Pages + Android APK built via GitHub Actions
- Built entirely on an 8GB Android phone (Termux + agy-termux)

The user wants task-aware routing with automatic fallback across providers. The user does NOT trust external repos like ai-router (maintenance risk), so we build the router from scratch with a minimal abstraction.

## ARCHITECTURE (3 LAYERS)

Layer 1: Routing Engine (BUILD FROM SCRATCH)
- Define a ProviderAdapter interface BEFORE writing any adapter:
  - discoverModels()
  - getCapabilities()
  - healthCheck()
  - getQuota()
  - chat()
  - stream()
  - normalizeError()
- Start with 2 adapters: GroqAdapter (OpenAI-compatible), GoogleAdapter (Gemini API)
- Normalize all errors at the adapter boundary into a fixed taxonomy:
  - AUTH_ERROR (401/403) -> disable route
  - RATE_LIMIT (429) -> 60s cooldown
  - TIMEOUT -> 30s cooldown
  - PROVIDER_UNAVAILABLE (5xx) -> 30s cooldown
  - MODEL_UNAVAILABLE -> remove candidate
  - CONTENT_POLICY -> try alternate route
- Route score formula:
  route_score = capability x task_fit x health x quota_headroom x latency_factor
- Route registry JSON schema (one entry per provider/model pair):
  {
    "route_id": "groq/openai/gpt-oss-120b",
    "provider": "groq",
    "model": "openai/gpt-oss-120b",
    "endpoint": "https://api.groq.com/openai/v1",
    "capabilities": { "coding": 82, "agentic": 74, "context": 131072 },
    "live": { "health": 0.98, "latency_ms": 420, "quota_remaining": 982 }
  }

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
- Step 3: Send request via the appropriate ProviderAdapter.
- Step 4: On 429/refusal/timeout, fall back to next best model (max 3 attempts total, then stop).

## FUNCTIONAL REQUIREMENTS
1. ProviderAdapter interface must be defined BEFORE any adapter is written.
2. Error normalization at adapter boundary, not in the router.
3. Health and quota tracking live in a SEPARATE JSON file from the model database.
4. Cooldowns: 429 = 60s; 401/403 = disabled until manual reset; timeout/5xx = 30s.
5. Task classification: keyword-based only (no ML).
6. models route --json returns machine-readable primary + fallbacks.
7. CLI is the privileged router. Do NOT put provider keys in the PWA.

## PHASES
Phase A (weeks 1-2):
1. Define ProviderAdapter interface.
2. Write GroqAdapter.
3. Write GoogleAdapter.
4. Implement error normalization layer.
5. Implement route registry JSON schema.
6. Implement cooldown and health tracking.
7. Add models route <task> command (info-only output for now).

Phase B (week 3):
8. Wire adapters into models route so it actually sends requests.
9. Add keyword task classification.
10. Add max-3-attempts refusal retry logic.
11. Implement --json output flag.
12. Test failover: Groq 429 -> Google -> stop.

Phase C (only if A+B are solid):
13. Add CerebrasAdapter, MistralAdapter.
14. Add simplified 10-prompt empirical refusal test.
15. Add local llama.cpp as final fallback via OpenAI-compatible endpoint.
16. Add CloudflareAdapter, NvidiaAdapter, CohereAdapter (only if needed).

## DO NOT DO
- Do NOT build 8 adapters at once. Two is enough to prove the architecture.
- Do NOT implement an ML-based task classifier.
- Do NOT build the full empirical benchmark until the router is used daily for a month.
- Do NOT put provider keys in the PWA. CLI is the privileged layer.
- Do NOT modify the core Ranked Matrix sorting logic, the 9-column DOM structure, or the Uptime/Latency parsing.