# PROJECT HANDOFF — MOBILE AI WORKSTATION / DYNAMIC MODEL ROUTER

We are continuing a technical planning conversation that was previously happening in a temporary/vanish-mode ChatGPT conversation.

## My hardware/environment

I do not have a PC.

My primary device is:

- Realme 11 5G
- Model: RMX3780
- SoC: MediaTek Dimensity 6100+
- RAM: 8 GB
- Storage: 256 GB
- Android / Realme UI
- Termux is my main development environment.

I have built a surprisingly capable AI-assisted development environment entirely on this phone.

Current tools:

- Termux
- agy-termux (Antigravity CLI)
- devx
- Sako RE Studio
- ADB and various Android development/reverse-engineering tools

I currently use agy-termux heavily for agentic coding and development.

I have NOT yet incorporated devx heavily into my workflow. I plan to use it more later, especially for RE/modding work.

Sako RE Studio currently feels like the best Ghidra-like RE environment for my mobile workflow.

I have already successfully built real projects entirely through this mobile AI setup.

---

# IMPORTANT PROJECT: Top_Models

GitHub:

https://github.com/anonymous5-coder/Top_Models

This is my own project.

It is called:

Top_Models — Ranked Matrix Dashboard

Its purpose is to dynamically discover and rank currently available FREE models from OpenRouter.

OpenRouter's free model catalog changes over time, so I deliberately did NOT make a static list.

The application fetches current model information when opened or when the user presses Refresh.

It currently:

1. Fetches available OpenRouter models.
2. Filters for free models.
3. Gets information for each model.
4. Gets benchmark/capability information.
5. Gets various model characteristics.
6. Calculates rankings.
7. Displays a ranked matrix dashboard.
8. Has multiple capability categories.
9. Tracks refusal estimates.
10. Has context-window information.
11. Has coding/agentic/intelligence-style scores.
12. Has summarization-related ranking.
13. Has other endpoint/model information.
14. Can export the data.
15. Has CLI access.
16. Can output the complete JSON dataset.
17. Can place/copy JSON data into cache/clipboard.
18. Is available as a PWA.
19. Is device-compatible.
20. Has an Android APK.
21. APK builds automatically through GitHub Actions when code is pushed.
22. The repository is public.

The dashboard is deliberately dynamic because free models change over time.

The current matrix is primarily a HUMAN-FACING model discovery/ranking interface.

---

# THE NEXT BIG GOAL

I want to evolve Top_Models into a:

## MULTI-PROVIDER DYNAMIC AI MODEL ROUTER

The idea:

I should NOT have to manually decide:

"Should I use Gemini?"

"Should I use DeepSeek?"

"Which free model is best today?"

"Which provider still has quota?"

"Which model has stopped working?"

"Which model is currently refusing RE-related work?"

"Which free model is best for coding?"

Instead, the system should automatically determine the best currently available model/provider for the task.

Conceptually:

USER / AGENT
      ↓
TASK CLASSIFICATION
      ↓
TOP_MODELS MODEL DATABASE
      ↓
TASK-SPECIFIC SCORING
      ↓
PROVIDER HEALTH / QUOTA / LATENCY
      ↓
BEST AVAILABLE MODEL
      ↓
FALLBACK CHAIN
      ↓
RESPONSE

---

# VERY IMPORTANT ARCHITECTURAL IDEA

Do NOT treat:

Provider = Model

Instead:

Provider
  ↓
Model
  ↓
Endpoint
  ↓
Current health
  ↓
Current quota
  ↓
Latency
  ↓
Capabilities

Example:

Google
 └── Gemini model
      └── Google API endpoint

Groq
 └── GPT-OSS
      └── Groq endpoint

Cerebras
 └── GPT-OSS
      └── Cerebras endpoint

OpenRouter
 ├── Model A
 ├── Model B
 ├── Model C
 └── ...

The router should treat these as separate inference routes.

---

# PROVIDERS TO INVESTIGATE

OpenRouter is currently the main provider.

But I want to investigate other free/cheap/free-tier providers, including:

- Google Gemini API
- Groq
- Cerebras
- Mistral
- NVIDIA
- Cloudflare Workers AI
- Cohere
- Hugging Face
- Any other legitimate current free inference providers

The provider list must be based on CURRENT information, not old "free API lists".

Provider quotas, models and free tiers change frequently.

Therefore the system should dynamically discover and monitor them where possible.

---

# ROUTING REQUIREMENTS

The router should eventually consider:

- model capability
- coding ability
- reasoning/intelligence
- agentic ability
- reverse-engineering suitability
- Android suitability
- context window
- tool calling
- vision/multimodal capability
- latency
- uptime
- provider health
- current quota
- 429 rate
- timeout rate
- error rate
- refusal behavior
- empirical task success
- availability
- cost

The final score should NOT simply be one universal model score.

Instead, create task-specific profiles such as:

- coding
- reverse engineering
- Android
- debugging
- general reasoning
- agentic coding
- long-context analysis
- summarization
- vision
- terminal work
- low-latency
- low-refusal

Example:

bestCoding()
bestRE()
bestAndroid()
bestAgent()
bestLongContext()

etc.

---

# VERY IMPORTANT: REFUSAL SCORE

The existing Top_Models system currently contains refusal-rate estimates.

However, these are NOT true empirical refusal measurements.

They are estimates generated from model information.

I want to improve this.

Potential future schema:

{
  "refusal_estimate": 20,
  "refusal_empirical": 14.7,
  "refusal_confidence": 0.82,
  "refusal_test_count": 120,
  "refusal_last_tested": "2026-10-05"
}

The important distinction:

refusal_estimate
=
heuristic/model-based estimate

refusal_empirical
=
actual observed behavior from standardized tests

These must not be conflated.

---

# FUTURE REVERSE-ENGINEERING BENCHMARK

One of the most important planned improvements is an empirical benchmark specifically for my use case.

Potential categories:

## Normal RE

- Explain ARM64 assembly.
- Explain Ghidra pseudocode.
- Identify structures.
- Explain ELF sections.
- Explain JNI.
- Explain native Android functions.
- Explain DEX/native relationships.

## Modding

- Analyze a locally owned test binary.
- Explain a native game function.
- Explain Unity IL2CPP structures.
- Explain how a modification would affect program behavior.
- Debug a locally controlled mod.

## More difficult RE/security tasks

- Analyze binary behavior.
- Identify protection mechanisms.
- Explain why a hook crashes.
- Analyze control/data flow.

Each model should receive the same benchmark.

Score:

- answered
- partial
- refused
- incorrect
- hallucinated
- technically correct

This produces:

EMPIRICAL RE SCORE

rather than simply trusting a generic benchmark.

---

# FALLBACK SYSTEM

The router should automatically select:

PRIMARY
↓
FALLBACK 1
↓
FALLBACK 2
↓
FALLBACK 3

Example:

Model A @ Provider X
↓ 429
Model A @ Provider Y
↓ unavailable
Model B @ Provider Z
↓ unavailable
Model C @ OpenRouter

But it should NOT endlessly retry.

Suggested behavior:

401 → disable route until credentials fixed
403 → disable route
429 → temporary cooldown
500 → short cooldown
timeout → short cooldown
provider unavailable → cooldown
refusal → try an appropriate alternative, with a small retry limit

---

# PROVIDER HEALTH

Every route should ideally track:

- last successful request
- last error
- error count
- timeout count
- 429 count
- current cooldown
- latency
- uptime
- quota estimate
- availability

A model with a benchmark score of 95 but currently returning 429 should NOT be selected over a model scoring 90 that is healthy.

---

# TERMUX INTEGRATION

Eventually I want commands such as:

models best re

models best coding

models best agent

models list

models route "analyze this ARM64 function"

Potential output:

Task:
reverse_engineering

Primary:
Model A @ Provider X

Fallback 1:
Model B @ Provider Y

Fallback 2:
Model C @ OpenRouter

Reason:
RE score: 94
Coding: 91
Refusal: 8%
Context: 1M
Latency: 420 ms
Provider health: 99.2%

---

# AGY-TERMUX / DEVX INTEGRATION

The ultimate goal is that agy-termux and devx do NOT need to know which model is currently best.

Instead they should be able to ask Top_Models:

"Give me the best available model for this task."

Top_Models becomes the routing layer.

Potential architecture:

agy-termux
      ↓
Top_Models Router
      ↓
Provider/model selection
      ↓
Best available inference endpoint

and:

devx
      ↓
Top_Models Router
      ↓
Provider/model selection
      ↓
Best available inference endpoint

---

# LOCAL MODELS

My phone has:

8 GB RAM
Dimensity 6100+

I am willing to use local LLMs if practical.

Likely approach:

llama.cpp / Termux

Small quantized models only.

Potentially 1–3B models as useful local/offline assistants.

I do NOT expect the phone to run huge 14B/32B/70B models efficiently.

Local models should be used for:

- simple coding
- shell assistance
- regex
- repetitive tasks
- offline brainstorming
- simple refactoring

Cloud models should handle:

- difficult reasoning
- large repositories
- difficult RE
- complex debugging
- architecture
- major implementation

---

# IMPORTANT PRINCIPLE

I do NOT want a static "best free AI models" list.

That becomes outdated.

I want a continuously changing system:

DISCOVER
→ TEST
→ RANK
→ MONITOR
→ ROUTE
→ FALLBACK
→ REPEAT

The system should adapt automatically as:

- models change
- new models appear
- free models disappear
- providers change quotas
- providers go offline
- model capabilities change
- refusal behavior changes

---

# CURRENT PROJECT STATUS

Top_Models already has the model-discovery/ranking foundation.

Do NOT propose rebuilding it from scratch.

The goal is to evolve it.

First priorities:

1. Multi-provider registry
2. Provider abstraction
3. Direct Google Gemini API
4. Groq
5. Cerebras
6. Mistral
7. NVIDIA
8. Cloudflare
9. Cohere
10. Provider health monitoring
11. Empirical RE benchmark
12. Task-specific scoring
13. Dynamic routing
14. Automatic fallback
15. Termux CLI integration
16. agy-termux/devx integration
17. Optional local llama.cpp backend

---

# YOUR ROLE

Act as a technical co-architect for this project.

Do NOT merely give generic advice.

When current provider/model information is needed, perform LIVE WEB RESEARCH.

Always distinguish:

- verified current information
- assumptions
- estimates
- empirical measurements
- third-party claims

When recommending providers, verify their CURRENT:

- free tier
- models
- API availability
- rate limits
- restrictions
- pricing
- OpenAI compatibility
- tool calling
- streaming
- context limits

Do not rely on old articles or outdated "free AI API" lists.

The final objective is:

## Build the best practical FREE AI orchestration/routing system possible for a PHONE-ONLY Termux environment.

The phone is the workstation.

Top_Models is the model intelligence/discovery layer.

The router is the decision layer.

agy-termux/devx are agent interfaces.

Termux is the execution environment.

Sako RE Studio is part of the RE environment.

The system should automatically find the best currently available model instead of making the user manually choose.