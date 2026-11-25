# Master Execution Plan: Human-AI Collaborative Obsidian Git Synchronization

> **Target Vault Path (Android):** `/storage/emulated/0/Documents/Obsidian`  
> **Remote Repository:** `https://github.com/anonymous5-coder/Obsidian_files.git`  
> **Repository Visibility:** **PUBLIC** (Required so remote AI agents, agentic IDEs, and cloud tools can inspect and reference plans, prompts, and documentation online)  
> **Security & Privacy Fortress:** **Strict Local-Only `private/` Boundary** (Permanently excluded via `.gitignore`; protects `Keys.md` and credentials from ever reaching GitHub)  
> **Core Sync Engine:** **Obsidian Git Community Plugin** (Official v2.43.0; managing Git execution, credentials, and merge conflict resolution)  
> **Mobile Controller & Sentry:** **GitSync Companion** (v1.2.0; Dual-Action FAB, 30ms local exit sentry defeating SIGKILL, Gold-Standard boot engine)  
> **Administrative & Scaffolding Tool:** **Termux Native Git CLI**  
> **Execution Status:** **NEW-STATE ARCHITECTURAL SYNTHESIS — LIVE CODEBASE DEPLOYED**  
> **Date:** November 19, 2026  

---

## 1. System Architecture & Workflow Overview

### 1.1 The Human-AI Co-Working Workflow:
* **Human Operator (Mobile):** Writes notes, documentation, prompts, and project plans locally inside the Obsidian Android application.
* **Autonomous AI Agents (Remote):** Agents across various cloud and desktop platforms (Antigravity, Claude, ChatGPT, Cursor, etc.) inspect public documentation 24/7 on GitHub.
* **Continuous Synchronization:**
  * **Human $\to$ AI:** Human edits notes $\to$ taps FAB for 30ms local save, or holds FAB for full Gold-Standard remote sync $\to$ AI agents read updated documentation online.
  * **Exit Safety:** If human closes or swiped away the app, GitSync Companion's 30ms exit sentry writes local commits to `.git/objects` before Android kernel `SIGKILL`.
  * **AI $\to$ Human:** On next launch, GitSync Companion's unified Gold-Standard boot sequence commits local edits first, pulls incoming AI agent notes, and pushes combined history.

```text
┌───────────────────────────────────────┐                 ┌───────────────────────────────────────┐
│        HUMAN OPERATOR (MOBILE)        │                 │        REMOTE AI AGENTS / IDEs        │
│      Obsidian App on Android Phone    │                 │      (Antigravity, Claude, etc.)      │
│      /storage/emulated/0/...          │                 │      Cloud & Desktop Environments     │
└──────────────────┬────────────────────┘                 └───────────────────▲───────────────────┘
                   │                                                          │
                   │ Dual-Action FAB / 30ms Exit Sentry                       │ Web / API / Git Read
                   │ (Commit-First -> Pull -> Push)                           │ (Public Inspection)
                   ▼                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  PUBLIC GITHUB REPOSITORY                                   │
│                         anonymous5-coder/Obsidian_files (Branch: main)                      │
│                                                                                             │
│  [Tracked Public Documentation]                             [Permanently Excluded on Phone] │
│  - 2_Conversations.md                                       - private/Keys.md               │
│  - AI Workflow System.md                                    - private/*                     │
│  - CONTEXT.md                                               - .obsidian/workspace.json      │
│  - GADGET_WORK_PLAN.md                                      - .obsidian/cache/              │
│  - doc.md, document.md, etc.                                - .trash/                       │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Sync Mechanics: The "Handy / Intentional" Architecture

Rather than relying on fragile ticking timers that fail when an app is quickly swiped away, the architecture uses intentional user controls and lifecycle hooks:

### 2.1 The Dual-Action FAB (Idea I1)
* **Short Tap (< 650ms): Instant Local Commit (30ms)**
  - Staged and committed directly to local `.git/objects` in ~30 milliseconds.
  - 100% offline-safe; zero network overhead.
  - FAB turns **🔵 Blue ("Committed Locally / Safe to Exit")** with a crisp single haptic vibration (`40ms`).
* **Long Press / Hold ($\ge$ 650ms): Full Gold-Standard Sync**
  - Sequentially executes: **Commit Local (1st) $\to$ Pull Remote (2nd) $\to$ Push Combined (3rd)**.
  - FAB pulses with accent glow $\to$ dual haptic vibration (`50ms, 50ms, 100ms`) $\to$ spinning sync animation $\to$ **🟢 Green Checkmark**.
* **Touch Dragging (> 8px displacement):**
  - Draggable anywhere on screen. Position persists across app restarts and dynamically clamps to screen boundaries during rotation.

### 2.2 30ms Local-Only Exit Sentry (Idea I5)
* When the app is minimized, switched, or swiped away (`visibilitychange === "hidden"` / `pagehide`):
* Fires `obsidian-git:commit` (30ms disk write).
* Uncommitted edits are permanently written to local flash storage before Android kernel delivers `SIGKILL` (~300ms).
* On the next launch, Boot Sync pushes the committed work to GitHub.

### 2.3 Unified Gold-Standard Boot Sequence (Idea I2)
* Runs at $t = 2.0\text{s}$ on app startup:
  $$\text{Commit Local (1st)} \longrightarrow \text{Pull Remote (2nd)} \longrightarrow \text{Push Combined (3rd)}$$
* Eliminates premature pull collisions and duplicate boot pulls.

---

## 3. Security Boundary: The `private/` Fortress

Because the repository is **PUBLIC**, credential isolation is enforced by physical folder separation and `.gitignore`:

1. **Physical Relocation:** `Keys.md` is located in `/storage/emulated/0/Documents/Obsidian/private/Keys.md`.
2. **Root `.gitignore` Deployment:**
   ```gitignore
   # ==============================================================================
   # STRICT PRIVATE SECURITY BOUNDARY (NEVER PUSHED TO PUBLIC GITHUB)
   # ==============================================================================
   private/
   private/**
   Keys.md
   *.key
   *.token
   *.env

   # ==============================================================================
   # OBSIDIAN RUNTIME & MOBILE LAYOUT ARTIFACTS
   # ==============================================================================
   .obsidian/workspace.json
   .obsidian/workspace-mobile.json
   .obsidian/cache/
   .obsidian/plugins/*/data.json.bak
   .trash/
   ```

---

## 4. Configuration Protocol for Obsidian Git & GitSync Companion

### A. In Obsidian Git (`Vinzent03/obsidian-git`):
* **Auto pull on boot:** Set to `false` (OFF) — *prevents premature pull before local commit; GitSync Companion owns unified Gold-Standard boot*.
* **Auto backup interval (minutes):** Set to `0` (Disabled) — *eliminates redundant background timers*.
* **Auto backup after stopping file edits:** Set to `false` (OFF).
* **Pull before push:** Set to `true` (ON; safety guarantee for manual syncs).
* **Push on commit and sync:** Set to `true` (ON).

### B. In GitSync Companion (`git-sync-companion`):
* **Show FAB on mobile:** ON (`true`).
* **Hold duration for full sync:** `650ms`.
* **Boot-time Gold-Standard sync:** ON (`true`).
* **Action on app exit / background:** `Local Commit Only` (`commit`).
* **Haptic feedback:** ON (`true`).
