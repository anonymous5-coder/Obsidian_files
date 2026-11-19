const { Plugin, PluginSettingTab, Setting, Notice, Platform, MarkdownView } = require("obsidian");

const DEFAULT_SETTINGS = {
  showFabOnMobile: true,
  showFabOnDesktop: false,
  holdDuration: 650, // ms hold threshold for full sync (tap < holdDuration is 30ms local commit)
  bootSync: true, // unified Gold-Standard startup sync (Commit 1st -> Pull 2nd -> Push 3rd)
  exitAction: "commit", // "commit" (30ms local disk commit before SIGKILL) | "sync" | "disabled"
  hapticFeedback: true,
  fabPosition: { bottom: 85, right: 20 },
};

// SVG Icons
const ICON_GIT_SYNC = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
</svg>`;

const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"/>
</svg>`;

module.exports = class GitSyncCompanionPlugin extends Plugin {
  async onload() {
    console.log("[GitSync Companion] Loading plugin v1.2.0 (New-State Dual-Action Architecture)...");
    await this.loadSettings();

    // State Machine: 'idle' | 'dirty' | 'committed' | 'syncing' | 'success'
    this.syncState = "idle";
    this.isDirty = false;
    this.isCommittedLocally = false;
    this.isSyncing = false;

    this.fabEl = null;
    this.successResetTimer = null;

    // 1. Settings Tab
    this.addSettingTab(new GitSyncCompanionSettingTab(this.app, this));

    // 2. Commands
    this.addCommand({
      id: "sync-now",
      name: "Sync Git now (Commit & Push)",
      callback: () => this.triggerCommitAndSync("command"),
    });

    this.addCommand({
      id: "commit-local-now",
      name: "Commit locally now (Instant save)",
      callback: () => this.triggerLocalCommit("command"),
    });

    this.addCommand({
      id: "toggle-fab",
      name: "Toggle floating sync button",
      callback: () => this.toggleFab(),
    });

    // 3. Vault & Editor Modification Listeners (Mark dirty state immediately on keystroke)
    this.registerEvent(this.app.vault.on("modify", () => this.onVaultChange("modify")));
    this.registerEvent(this.app.vault.on("create", () => this.onVaultChange("create")));
    this.registerEvent(this.app.vault.on("delete", () => this.onVaultChange("delete")));
    this.registerEvent(this.app.vault.on("rename", () => this.onVaultChange("rename")));
    this.registerEvent(this.app.workspace.on("editor-change", () => this.onVaultChange("editor")));

    // Helper: Flush active editor in-memory buffer to disk
    this.flushActiveEditor = () => {
      try {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && typeof activeView.save === "function") {
          activeView.save();
        }
      } catch (e) {}
    };

    // 4. Hook obsidian-git events for visual badge updates
    this.registerEvent(this.app.workspace.on("obsidian-git:refs-changed", () => this.onGitRefsChanged()));
    this.registerEvent(this.app.workspace.on("obsidian-git:head-change", () => this.onGitRefsChanged()));

    // 5. 30ms Local-Only Exit Sentry (Android App Switch, Screen Lock, Minimize, Swipe-Out)
    this.handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        this.flushActiveEditor();
        if (this.settings.exitAction === "commit" && this.isDirty) {
          console.log("[GitSync Companion] App hidden with pending edits. Running 30ms local commit sentry...");
          this.triggerLocalCommit("lifecycle-exit");
        } else if (this.settings.exitAction === "sync" && (this.isDirty || this.isCommittedLocally)) {
          console.log("[GitSync Companion] App hidden. Triggering full remote sync...");
          this.triggerCommitAndSync("lifecycle-exit");
        }
      }
    };

    this.handlePageHide = () => {
      this.flushActiveEditor();
      if (this.settings.exitAction === "commit" && this.isDirty) {
        console.log("[GitSync Companion] Pagehide event. Running 30ms local commit sentry...");
        this.triggerLocalCommit("pagehide");
      } else if (this.settings.exitAction === "sync" && (this.isDirty || this.isCommittedLocally)) {
        console.log("[GitSync Companion] Pagehide event. Triggering full remote sync...");
        this.triggerCommitAndSync("pagehide");
      }
    };

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("pagehide", this.handlePageHide);

    // Dynamic Orientation & Viewport Resize Clamping
    this.handleResize = () => {
      if (this.fabEl) {
        const maxBottom = window.innerHeight - 60;
        const maxRight = window.innerWidth - 60;
        const currentBottom = parseInt(this.fabEl.style.bottom || "85", 10);
        const currentRight = parseInt(this.fabEl.style.right || "20", 10);
        const clampedBottom = Math.max(10, Math.min(maxBottom, currentBottom));
        const clampedRight = Math.max(10, Math.min(maxRight, currentRight));
        this.fabEl.style.bottom = `${clampedBottom}px`;
        this.fabEl.style.right = `${clampedRight}px`;
      }
    };
    window.addEventListener("resize", this.handleResize);

    this.registerEvent(
      this.app.workspace.on("quit", () => {
        if (this.settings.exitAction === "commit" && this.isDirty) {
          this.triggerLocalCommit("desktop-quit");
        } else if (this.settings.exitAction === "sync" && (this.isDirty || this.isCommittedLocally)) {
          this.triggerCommitAndSync("desktop-quit");
        }
      })
    );

    // 6. Initialize UI & Unified Gold-Standard Boot Engine
    this.app.workspace.onLayoutReady(async () => {
      this.initFab();
      if (this.settings.bootSync) {
        // Wait 2.0s for obsidian-git to initialize repository
        window.setTimeout(() => this.runBootSync(), 2000);
      }
    });
  }

  onVaultChange(type) {
    this.isDirty = true;
    this.isCommittedLocally = false;
    this.syncState = "dirty";
    this.updateFabUI();
  }

  // Idea I1 & I5: Fast Local Commit (30ms, Zero Network, 100% Offline Durability)
  async triggerLocalCommit(source = "manual") {
    if (this.isSyncing) return;
    this.flushActiveEditor();

    const gitPlugin = this.app.plugins?.getPlugin("obsidian-git");
    if (!gitPlugin) return;

    try {
      console.log(`[GitSync Companion] Fast local commit (${source})...`);
      const executed = this.app.commands.executeCommandById("obsidian-git:commit");
      if (!executed && gitPlugin.gitActions?.commit) {
        await gitPlugin.promiseQueue.addTask(() =>
          gitPlugin.gitActions.commit({ fromAuto: true, mode: "all" })
        );
      }

      this.isDirty = false;
      this.isCommittedLocally = true;
      this.syncState = "committed";
      this.updateFabUI();

      if (source !== "lifecycle-exit" && source !== "pagehide") {
        new Notice("GitSync: Saved locally (30ms)", 1500);
      }
    } catch (err) {
      console.error("[GitSync Companion] Local commit failed:", err);
    }
  }

  // Idea I1: Full Gold-Standard Sync (Commit 1st -> Pull 2nd -> Push 3rd)
  async triggerCommitAndSync(source = "manual") {
    if (this.isSyncing) {
      console.log(`[GitSync Companion] Sync already in progress, ignoring trigger from ${source}.`);
      return;
    }
    this.flushActiveEditor();

    this.isSyncing = true;
    this.syncState = "syncing";
    this.updateFabUI();

    const gitPlugin = this.app.plugins?.getPlugin("obsidian-git");
    if (!gitPlugin) {
      new Notice("GitSync Companion: 'obsidian-git' is not active.");
      this.isSyncing = false;
      this.syncState = this.isDirty ? "dirty" : "idle";
      this.updateFabUI();
      return;
    }

    try {
      new Notice("GitSync: Syncing with GitHub...", 2000);
      // obsidian-git:push executes commitAndSync (Commit 1st -> Pull 2nd -> Push 3rd)
      const executed = this.app.commands.executeCommandById("obsidian-git:push");
      if (!executed) {
        if (gitPlugin.gitActions?.commitAndSync) {
          await gitPlugin.promiseQueue.addTask(() =>
            gitPlugin.gitActions.commitAndSync({ fromAutoBackup: source.startsWith("lifecycle") })
          );
        } else {
          throw new Error("Unable to trigger obsidian-git sync.");
        }
      }

      this.isDirty = false;
      this.isCommittedLocally = false;
    } catch (err) {
      console.error("[GitSync Companion] Sync failed:", err);
      new Notice(`GitSync error: ${err.message || err}`, 4000);
      this.isSyncing = false;
      this.syncState = this.isDirty ? "dirty" : "idle";
      this.updateFabUI();
    }
  }

  // Idea I2: Unified Gold-Standard Boot Engine
  // Uses the same atomic commitAndSync path as the hold-sync FAB action.
  // obsidian-git:push internally runs Commit 1st -> Pull 2nd -> Push 3rd as one
  // atomic operation, firing refs-changed only once at the end.
  async runBootSync() {
    if (!this.settings.bootSync) return;
    const gitPlugin = this.app.plugins?.getPlugin("obsidian-git");
    if (!gitPlugin?.gitManager) return;

    try {
      console.log("[GitSync Companion] Running Gold-Standard boot sync...");

      // Pre-flight check: determine what work exists
      let hasUncommitted = false;
      let hasUnpushed = false;
      try {
        const status = await gitPlugin.gitManager.status();
        hasUncommitted = status && (
          (status.changed && status.changed.length > 0) ||
          (status.staged && status.staged.length > 0) ||
          (status.not_added && status.not_added.length > 0)
        );
      } catch (e) {}
      try {
        hasUnpushed = await gitPlugin.gitManager.canPush();
      } catch (e) {}

      if (!hasUncommitted && !hasUnpushed) {
        console.log("[GitSync Companion] Boot: Nothing to sync. Vault clean & remote up to date.");
        return;
      }

      // Show notice based on what needs syncing
      if (hasUncommitted && hasUnpushed) {
        new Notice("GitSync: Boot sync — securing edits & pushing pending commits...", 3000);
      } else if (hasUncommitted) {
        new Notice("GitSync: Boot sync — securing uncommitted edits...", 3000);
      } else {
        new Notice("GitSync: Boot sync — pushing pending commits...", 3000);
      }

      // Delegate to the same atomic commitAndSync used by FAB hold-sync.
      // This ensures Commit 1st -> Pull 2nd -> Push 3rd runs as a single
      // operation inside obsidian-git's serial promise queue.
      await this.triggerCommitAndSync("boot-sync");

    } catch (err) {
      console.error("[GitSync Companion] Boot sync error:", err);
      new Notice(`GitSync Boot error: ${err.message || err}`, 4000);
    }
  }

  async onGitRefsChanged() {
    this.isSyncing = false;
    const gitPlugin = this.app.plugins?.getPlugin("obsidian-git");

    if (gitPlugin?.gitManager?.canPush) {
      try {
        const canPush = await gitPlugin.gitManager.canPush();
        if (canPush) {
          // Local commits exist, unpushed -> maintain Blue "Committed" badge!
          this.isDirty = false;
          this.isCommittedLocally = true;
          this.syncState = "committed";
          this.updateFabUI();
          return;
        }
      } catch (e) {}
    }

    // Fully in sync with remote
    this.isDirty = false;
    this.isCommittedLocally = false;
    this.showSuccessFeedback();
  }

  showSuccessFeedback() {
    if (!this.fabEl) return;

    this.syncState = "success";
    this.fabEl.className = "gitsync-fab gitsync-fab-success";
    this.fabEl.innerHTML = ICON_CHECK;

    if (this.successResetTimer) {
      window.clearTimeout(this.successResetTimer);
    }

    this.successResetTimer = window.setTimeout(() => {
      this.syncState = "idle";
      this.updateFabUI();
    }, 2000);
  }

  updateFabUI() {
    if (!this.fabEl) return;

    switch (this.syncState) {
      case "syncing":
        this.fabEl.className = "gitsync-fab gitsync-fab-syncing";
        this.fabEl.innerHTML = ICON_GIT_SYNC;
        break;
      case "dirty":
        this.fabEl.className = "gitsync-fab gitsync-fab-dirty";
        this.fabEl.innerHTML = `${ICON_GIT_SYNC}<div class="gitsync-fab-badge-orange"></div>`;
        break;
      case "committed":
        this.fabEl.className = "gitsync-fab gitsync-fab-committed";
        this.fabEl.innerHTML = `${ICON_GIT_SYNC}<div class="gitsync-fab-badge-blue"></div>`;
        break;
      case "success":
        this.fabEl.className = "gitsync-fab gitsync-fab-success";
        this.fabEl.innerHTML = ICON_CHECK;
        break;
      case "idle":
      default:
        this.fabEl.className = "gitsync-fab gitsync-fab-idle";
        this.fabEl.innerHTML = ICON_GIT_SYNC;
        break;
    }
  }

  // Idea I1: The Dual-Action FAB (Short Tap = 30ms Commit, Long Press = Full Sync, Drag = Reposition)
  initFab() {
    const shouldShow = Platform.isMobileApp
      ? this.settings.showFabOnMobile
      : this.settings.showFabOnDesktop;

    if (!shouldShow) {
      this.destroyFab();
      return;
    }

    if (this.fabEl) return;

    const fab = document.createElement("div");
    fab.className = "gitsync-fab gitsync-fab-idle";
    fab.setAttribute("aria-label", "GitSync: Tap to commit (30ms), Hold to full sync");
    fab.innerHTML = ICON_GIT_SYNC;

    const { bottom, right } = this.settings.fabPosition || { bottom: 85, right: 20 };
    fab.style.bottom = `${bottom}px`;
    fab.style.right = `${right}px`;

    let startX = 0;
    let startY = 0;
    let initialBottom = bottom;
    let initialRight = right;
    let isDragging = false;
    let holdTimer = null;
    let holdFired = false;
    const DRAG_THRESHOLD = 8;

    const clearHold = () => {
      if (holdTimer) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      fab.classList.remove("gitsync-fab-holding");
    };

    // --- Touch Handlers (Mobile) ---
    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      const rect = fab.getBoundingClientRect();
      initialBottom = window.innerHeight - rect.bottom;
      initialRight = window.innerWidth - rect.right;
      isDragging = false;
      holdFired = false;

      clearHold();
      fab.classList.add("gitsync-fab-holding");

      const duration = this.settings.holdDuration || 650;
      holdTimer = window.setTimeout(() => {
        if (!isDragging) {
          holdFired = true;
          clearHold();
          if (this.settings.hapticFeedback && navigator.vibrate) {
            try {
              navigator.vibrate([50, 50, 100]); // Dual buzz for full sync
            } catch (vErr) {}
          }
          this.triggerCommitAndSync("fab-hold");
        }
      }, duration);
    };

    const onTouchMove = (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = startX - touch.clientX;
      const deltaY = startY - touch.clientY;

      if (!isDragging && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
        isDragging = true;
        clearHold();
      }

      if (isDragging) {
        e.preventDefault();
        let newBottom = initialBottom + deltaY;
        let newRight = initialRight + deltaX;

        const maxBottom = window.innerHeight - 60;
        const maxRight = window.innerWidth - 60;
        newBottom = Math.max(10, Math.min(maxBottom, newBottom));
        newRight = Math.max(10, Math.min(maxRight, newRight));

        fab.style.bottom = `${newBottom}px`;
        fab.style.right = `${newRight}px`;
      }
    };

    const onTouchEnd = (e) => {
      const wasHolding = !isDragging && !holdFired;
      clearHold();

      if (isDragging) {
        const rect = fab.getBoundingClientRect();
        this.settings.fabPosition = {
          bottom: Math.round(window.innerHeight - rect.bottom),
          right: Math.round(window.innerWidth - rect.right),
        };
        this.saveSettings();
      } else if (wasHolding) {
        // Short Tap: Local Commit Only (30ms)
        if (this.settings.hapticFeedback && navigator.vibrate) {
          try {
            navigator.vibrate(40); // Single buzz for local commit
          } catch (vErr) {}
        }
        this.triggerLocalCommit("fab-tap");
      }
      isDragging = false;
      holdFired = false;
    };

    const onTouchCancel = () => {
      clearHold();
      isDragging = false;
      holdFired = false;
    };

    fab.addEventListener("touchstart", onTouchStart, { passive: false });
    fab.addEventListener("touchmove", onTouchMove, { passive: false });
    fab.addEventListener("touchend", onTouchEnd, { passive: false });
    fab.addEventListener("touchcancel", onTouchCancel, { passive: false });

    // --- Mouse Handlers (Desktop fallback) ---
    let mouseStartX = 0;
    let mouseStartY = 0;
    let mouseDragging = false;
    let mouseHoldFired = false;
    let mouseHoldTimer = null;

    const onMouseDown = (e) => {
      if (Platform.isMobileApp || e.button !== 0) return;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      const rect = fab.getBoundingClientRect();
      initialBottom = window.innerHeight - rect.bottom;
      initialRight = window.innerWidth - rect.right;
      mouseDragging = false;
      mouseHoldFired = false;

      if (mouseHoldTimer) window.clearTimeout(mouseHoldTimer);
      fab.classList.add("gitsync-fab-holding");

      const duration = this.settings.holdDuration || 650;
      mouseHoldTimer = window.setTimeout(() => {
        if (!mouseDragging) {
          mouseHoldFired = true;
          fab.classList.remove("gitsync-fab-holding");
          this.triggerCommitAndSync("fab-hold");
        }
      }, duration);

      const onMouseMove = (moveEvent) => {
        const deltaX = mouseStartX - moveEvent.clientX;
        const deltaY = mouseStartY - moveEvent.clientY;
        if (!mouseDragging && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
          mouseDragging = true;
          if (mouseHoldTimer) window.clearTimeout(mouseHoldTimer);
          fab.classList.remove("gitsync-fab-holding");
        }
        if (mouseDragging) {
          let newBottom = initialBottom + deltaY;
          let newRight = initialRight + deltaX;
          const maxBottom = window.innerHeight - 60;
          const maxRight = window.innerWidth - 60;
          fab.style.bottom = `${Math.max(10, Math.min(maxBottom, newBottom))}px`;
          fab.style.right = `${Math.max(10, Math.min(maxRight, newRight))}px`;
        }
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        if (mouseHoldTimer) window.clearTimeout(mouseHoldTimer);
        fab.classList.remove("gitsync-fab-holding");

        if (mouseDragging) {
          const rect = fab.getBoundingClientRect();
          this.settings.fabPosition = {
            bottom: Math.round(window.innerHeight - rect.bottom),
            right: Math.round(window.innerWidth - rect.right),
          };
          this.saveSettings();
        } else if (!mouseHoldFired) {
          this.triggerLocalCommit("fab-click");
        }
        mouseDragging = false;
        mouseHoldFired = false;
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };

    fab.addEventListener("mousedown", onMouseDown);

    document.body.appendChild(fab);
    this.fabEl = fab;
    this.updateFabUI();
  }

  destroyFab() {
    if (this.fabEl) {
      this.fabEl.remove();
      this.fabEl = null;
    }
  }

  toggleFab() {
    if (Platform.isMobileApp) {
      this.settings.showFabOnMobile = !this.settings.showFabOnMobile;
    } else {
      this.settings.showFabOnDesktop = !this.settings.showFabOnDesktop;
    }
    this.saveSettings();
    this.initFab();
    new Notice(`Floating Git Sync Button: ${this.fabEl ? "Enabled" : "Disabled"}`);
  }

  async loadSettings() {
    const loaded = (await this.loadData()) || {};
    // Backward compatibility migration from v1.1.0
    if (loaded.exitAction === undefined) {
      if (loaded.autoSyncOnExit === false) {
        loaded.exitAction = "disabled";
      } else if (loaded.autoSyncOnExit === true) {
        loaded.exitAction = "commit";
      }
    }
    if (loaded.bootSync === undefined && loaded.bootAutoRecovery !== undefined) {
      loaded.bootSync = loaded.bootAutoRecovery;
    }
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    console.log("[GitSync Companion] Unloading plugin...");

    if (this.handleVisibilityChange) {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
    if (this.handlePageHide) {
      window.removeEventListener("pagehide", this.handlePageHide);
    }
    if (this.handleResize) {
      window.removeEventListener("resize", this.handleResize);
    }

    if (this.successResetTimer) {
      window.clearTimeout(this.successResetTimer);
    }

    this.destroyFab();
  }
};

// Idea I4: Transparent, Flat Settings UI (No Rigid Mode Presets)
class GitSyncCompanionSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "GitSync Companion Settings" });
    containerEl.createEl("p", {
      text: "Handy mobile companion for Obsidian Git. Tap the button to save locally in ~30ms, hold to trigger a full remote sync. Protects edits on exit before Android SIGKILL.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Show floating action button on mobile")
      .setDesc("Displays a draggable sync button on screen. Tap to commit locally (30ms), Hold to full sync.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showFabOnMobile).onChange(async (val) => {
          this.plugin.settings.showFabOnMobile = val;
          await this.plugin.saveSettings();
          this.plugin.initFab();
        })
      );

    new Setting(containerEl)
      .setName("Show floating action button on desktop")
      .setDesc("Enable the floating sync button on desktop environments.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showFabOnDesktop).onChange(async (val) => {
          this.plugin.settings.showFabOnDesktop = val;
          await this.plugin.saveSettings();
          this.plugin.initFab();
        })
      );

    new Setting(containerEl)
      .setName("Hold duration for full sync (ms)")
      .setDesc("How long to hold the button to trigger a full remote sync (Commit 1st -> Pull 2nd -> Push 3rd). A quick tap (< hold duration) saves locally in ~30ms.")
      .addSlider((slider) =>
        slider
          .setLimits(400, 1200, 50)
          .setValue(this.plugin.settings.holdDuration || 650)
          .setDynamicTooltip()
          .onChange(async (val) => {
            this.plugin.settings.holdDuration = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Boot-time Gold-Standard sync")
      .setDesc("Automatically runs the unified sequence (Commit 1st -> Pull 2nd -> Push 3rd) on app startup. (Requires setting 'Auto pull on boot' to OFF in Obsidian Git).")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.bootSync).onChange(async (val) => {
          this.plugin.settings.bootSync = val;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Action on app exit / background")
      .setDesc("Choose what happens when Obsidian is minimized, switched, or closed. 'Local Commit Only' finishes in ~30ms before Android kernel SIGKILL.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("commit", "Local Commit Only (Recommended - 30ms, SIGKILL-safe)")
          .addOption("sync", "Full Remote Sync (Commit & Push)")
          .addOption("disabled", "Disabled")
          .setValue(this.plugin.settings.exitAction || "commit")
          .onChange(async (val) => {
            this.plugin.settings.exitAction = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Haptic feedback")
      .setDesc("Vibrate briefly on tap (single buzz) and hold (dual buzz).")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.hapticFeedback).onChange(async (val) => {
          this.plugin.settings.hapticFeedback = val;
          await this.plugin.saveSettings();
        })
      );
  }
}
