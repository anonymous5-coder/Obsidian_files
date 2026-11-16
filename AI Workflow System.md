# PROMPT:

---

# UWP v0.1 — Targeted Specification Revision Proposal

## Objective

Prepare a minimal, evidence-grounded revision proposal for `UWP_V0_1_AND_SYNC_CONSOLIDATION_PLAN.md`, based on the completed Cross-CLI Portability Review.

**Scope clarification:** UWP is intended for AI agents operating through CLI-based development environments, primarily `agy` and `devx` in Termux, with future compatibility goals for Hermes, OpenClaw, and other CLI agents. ChatGPT, Argon, DeepSeek, and other mobile AI applications may assist with external planning or review, but they are not UWP execution targets and require no UWP adapters.

The objective is to clarify the smallest useful portable workflow protocol—not expand the architecture or begin implementation.

## Required changes to propose

1. Define the functional lifecycle as **Plan → Authorize → Implement and Verify**. Retain the six stages as optional explanatory detail if useful.
2. Make `STATE.json` and layered context loading optional implementation strategies.
3. Distinguish procedural human approval from technically enforced controls. Define scoped authorization, baseline checks, and when execution must pause.
4. Generalize workspace baselines, verification, and rollback so workflows can operate with or without Git, Node.js, or a software build system.
5. Require explicit authorization for cross-provider model fallback where prompts, code, or other user data would be sent to another provider.
6. Keep Top_Models integration, UWA, and model-selection contracts optional and separate from workflow authorization.
7. Preserve the distinction between verified facts, proposals, unresolved owner decisions, and explicitly confirmed decisions. Do not label DEC-01 owner-confirmed without evidence of explicit owner approval.
8. Define portability in terms of a protocol core and CLI-specific adapters. Account for differences in shell execution, filesystem access, persistence, permissions, approval mechanisms, context handling, and available tools. Do not claim compatibility with uninstalled agents.

## Execution boundaries

- Inspect the current document and relevant review evidence.
- Do not modify any files yet.
- Do not create another report file.
- Do not commit, push, switch branches, or implement Top_Models `0C-6E`.
- Return the proposed changes as a concise section-by-section plan and unified diff in the terminal.
- Identify decisions that genuinely require owner input rather than silently choosing for the owner.
- Avoid unrelated rewrites, duplicated instructions, and speculative architecture.

**Stop after presenting the proposal. Wait for explicit authorization before applying any changes.**

---

# Context:

---

### The full plan for universal CLI workflow system

 objective is bigger than revising one Markdown file. I want a reusable workflow system for AI-assisted development and technical work on my phone, starting with `agy` and `devx` in Termux, and designed to accommodate Hermes, OpenClaw, and other CLI agents later.

The system should help your agents work on real projects reliably, preserve important context across sessions, coordinate planning and execution, avoid unauthorized changes, verify their work, and recover safely from failures—all without tying the workflow to one agent, model, repository, or application.

We  may approach this as a staged engineering project, not as an attempt to design the entire system perfectly on paper before testing it.

### 1\. The roadmap

### 1

### Finish architecture discovery

Current stage

Use the completed portability audit to identify the important corrections. Send the targeted revision prompt to `agy`. Have it return a proposed diff without editing anything.

Deliverable: an evidence-grounded specification revision proposal and a short list of genuine owner decisions.

### 2

### Define the minimum UWP contract

Decide what every compliant workflow must preserve, independently of how an agent implements it. Keep optional mechanisms out of the mandatory core.

Deliverable: a small, reviewable UWP v0.1 specification covering workflow phases, authorization, execution boundaries, verification, state and recovery.

### 3

### Design the adapter approach

Determine how the protocol maps onto `agy` and `devx`, which capabilities are native, which need instructions or helper scripts, and which safeguards cannot be guaranteed.

Deliverable: an initial `agy` adapter approach and a `devx` adaptation plan. These do not need to be separate software packages.

### 4

### Build the smallest practical implementation

Start with instructions and existing CLI facilities. Add scripts or persistent state only where they solve a demonstrated problem. Avoid building UWA or a large orchestration framework at this stage.

Deliverable: a working protocol workflow that can be followed repeatedly in your existing Termux environment.

### 5

### Test it against real tasks

Use it on representative tasks: a read-only repository audit, a bounded code change, a task requiring verification and rollback, and a task that must pause for approval. Include a non-Git task if that is relevant to your work.

Deliverable: observed results, failure cases, and a clear distinction between proven behavior and intended behavior.

### 6

### Adapt and validate `devx`

Test the same core rules using `devx`, including workflows relevant to reverse engineering and modding. Document differences rather than forcing `devx` to imitate `agy` internally.

Deliverable: a second validated adapter or a documented compatibility gap.

### 7

### Return to Top_Models `0C-6E`

Resume the existing application milestone independently, using its preparation report and separately confirmed implementation decisions. Use UWP to help manage the work, not as a reason to delay it indefinitely.

Deliverable: progress on the actual Top_Models application.

### 8

### Expand only when justified

Later, evaluate Hermes and OpenClaw when installed. Consider more advanced orchestration, automated model selection, multi-agent coordination, and UWA only when practical evidence shows a need.

Deliverable: a portable system that grows based on actual requirements rather than speculation.

This is a proposed roadmap, not a finalized architecture or authorization to change your repositories. We can adjust it as we learn from the first implementation.

### 2\. How would the protocol and workflow system actually be built?

I would separate it into three conceptual layers. This is a candidate architecture to explore, not a final decision.

### Layer 1 — Universal Workflow Protocol (UWP)

The rules and contracts shared by compatible workflows

* How a task is planned and scoped

* How authorization is established

* How execution and verification are handled

* How state, failures and handoffs are recorded

### Layer 2 — CLI adapters

Translate the protocol into each environment's actual capabilities

agy adapter

Termux / Android

devx adapter

Termux / RE workflows

Future adapter

Hermes

Future adapter

OpenClaw

### Layer 3 — Tools and execution environment

Shell, filesystem, Git, project tools, test runners, APIs and other available capabilities

The arrows represent conceptual responsibilities, not a requirement to build a software framework. Initially, UWP might consist mostly of concise Markdown instructions and a few optional scripts. A formal API or executable orchestration engine may turn out to be unnecessary.

### What might UWP include?

These are the areas I would investigate and potentially include. Their exact format and mandatory status remain undecided.

| Component                    | Purpose                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Task contract                | Define the objective, scope, constraints, expected result and acceptance criteria.                               |
| Workspace baseline           | Establish what is known about the starting state and detect relevant changes before execution.                   |
| Planning and decision record | Separate observations, assumptions, proposed actions and decisions requiring your approval.                      |
| Authorization rules          | Specify which actions are permitted, which require approval and how approval scope is interpreted.               |
| Execution rules              | Keep changes within the authorized scope and constrain retries, fallback and external side effects.              |
| Verification contract        | Define how the agent demonstrates that the task succeeded, including independent human checks where appropriate. |
| Recovery and handoff         | Record failures, remaining work, rollback options and the information needed to resume in a new session.         |
| Context management           | Preserve important project decisions and load relevant context without repeatedly supplying every document.      |
| Adapter contract             | Describe what an environment must provide, what it cannot provide and how limitations are handled.               |

A key design principle: the protocol should define required behavior, not require a particular implementation mechanism.

For example, a workspace baseline might be a Git commit, a set of file hashes, a backup, or a documented starting state. Which is suitable depends on the task.

Likewise, persistent JSON state might help resume a long task, but a short task could be handled entirely within one session.

### Would it require a special program?

Not necessarily.

I would test the following progression:

* Instruction-based protocol: clear rules and reusable task formats that `agy` can follow.

* Small supporting utilities: only where repeated work benefits from deterministic checks, state handling or validation.

* Environment adapters: configuration, instructions or scripts that map the common rules to each CLI.

* Optional orchestration software: consider this only if the simpler approach cannot reliably coordinate the work.

This avoids prematurely creating a second development project just to manage your existing projects.

### 3\. Why do I need to know how `agy`, `devx` and other CLIs work?

Because a portable protocol cannot safely assume that different agents execute instructions in the same way.

However, we do not need to investigate every feature of every CLI before designing UWP. We need to understand the capabilities that materially affect the protocol and its safety.

Consider a few concrete examples.

### Example A — File modifications

Suppose UWP says: “Inspect the project without changing anything.”

* One CLI may have a dedicated filesystem tool with read-only operations.

* Another may have a general file-editing tool.

* Another may execute arbitrary shell commands.

The protocol rule can remain the same. The adapter must establish how read-only inspection is performed and what safeguards are actually available.

### Example B — Approval

Suppose you approve changes to two files.

An adapter needs to know whether its agent can distinguish approved files from other files, whether its execution mode automatically approves commands, and whether any external mechanism enforces the boundary.

If the environment cannot technically enforce that scope, UWP must not claim that it can. It should document the limitation and use the strongest practical safeguards available.

### Example C — Resuming work

Suppose an agent reaches its context limit or you start a new session.

One environment might preserve task state; another might require a handoff note or a state file. The protocol should preserve the necessary information without requiring every CLI to implement the same persistence mechanism.

### Example D — Verification

Suppose a code change needs testing.

A JavaScript project might have a test runner. An APK-modification task might need artifact inspection and installation testing. A research task might require source verification rather than a build.

UWP should define the requirement to verify against the task's acceptance criteria. The adapter and task determine which verification methods apply.

These examples illustrate why capability discovery matters. Without it, we risk writing rules that sound good but cannot be followed, or assuming a safety guarantee that the actual CLI does not provide.

### What exactly should we inspect?

Only the relevant capabilities:

* Filesystem access and mutation mechanisms.

* Command execution and execution modes.

* Approval controls, permissions and sandboxing.

* Context limits and session persistence.

* Available verification tools.

* Ways to establish a baseline and recover from unwanted changes.

* Tool limitations and known failure modes.

We do not need a comprehensive feature-by-feature comparison of every agent, nor do we need to reverse-engineer every internal implementation. The audit has already begun this discovery. We should reuse its findings and investigate further only where a design decision depends on missing evidence.

Also, the fact that `agy` or `devx` exposes a capability does not mean UWP must use it. We need to distinguish what an environment can do from what the protocol requires.

### 4\. How do Top_Models and model routing fit into this?

They should remain separate from the workflow protocol.

Your workflow system determines things such as:

* What task is being performed.

* Which actions are authorized.

* What context the agent needs.

* How success is verified.

* What happens when execution fails.

Model routing determines which model or provider should be used for a particular request, based on capability, availability, constraints, cost and other verified information.

Top_Models may eventually provide model-selection information to your workflow, but UWP should remain useful without it. It should also avoid assuming that selecting a model grants permission to use a provider or transmit data to it.
    
This separation lets you improve your model router without redesigning the workflow lifecycle, and improve UWP without coupling it to one model catalog.

