const { Plugin, PluginSettingTab, Setting, Notice, Platform } = require("obsidian");

const DEFAULT_SETTINGS = {
  autoSyncOnExit: true,
  showFabOnMobile: true,
  showFabOnDesktop: false,
  fabPosition: { bottom: 85, right: 20 },
  localPreCommitSeconds: 6, // 6 seconds pause -> instant local Git commit (30ms)
  bootAutoRecovery: true,   // Automatically pushes pending commits on app launch
  hapticFeedback: true,
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
    console.log("[GitSync Companion] Loading plugin v1.1.0...");
    await this.loadSettings();

    // State Machine: 'idle' | 'dirty' | 'committed' | 'syncing' | 'success'
    this.syncState = "idle";
    this.isDirty = false;
    this.isCommittedLocally = false;
    this.isSyncing = false;

    this.fabEl = null;
    this.preCommitTimer = null;
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
      callback: () => this.triggerLocalPreCommit("command"),
    });

    this.addCommand({
      id: "toggle-fab",
      name: "Toggle floating sync button",
      callback: () => this.toggleFab(),
    });

    // 3. Vault Modification Listeners
    this.registerEvent(this.app.vault.on("modify", () => this.onVaultChange("modify")));
    this.registerEvent(this.app.vault.on("create", () => this.onVaultChange("create")));
    this.registerEvent(this.app.vault.on("delete", () => this.onVaultChange("delete")));
    this.registerEvent(this.app.vault.on("rename", () => this.onVaultChange("rename")));

    // 4. Hook obsidian-git events
    this.registerEvent(this.app.workspace.on("obsidian-git:refs-changed", () => this.onGitRefsChanged()));
    this.registerEvent(this.app.workspace.on("obsidian-git:head-change", () => this.onGitRefsChanged()));

    // 5. App Lifecycle Listeners (Android App Switch, Screen Lock, Window Blur)
    this.handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && this.settings.autoSyncOnExit) {
        if (this.isDirty || this.isCommittedLocally) {
          console.log("[GitSync Companion] App hidden with pending changes. Triggering exit sync...");
          this.triggerCommitAndSync("lifecycle-exit");
        }
      }
    };

    this.handlePageHide = () => {
      if (this.settings.autoSyncOnExit && (this.isDirty || this.isCommittedLocally)) {
        console.log("[GitSync Companion] Pagehide event with pending changes. Triggering exit sync...");
        this.triggerCommitAndSync("pagehide");
      }
    };

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("pagehide", this.handlePageHide);

    this.registerEvent(
      this.app.workspace.on("quit", () => {
        if (this.settings.autoSyncOnExit && (this.isDirty || this.isCommittedLocally)) {
          this.triggerCommitAndSync("desktop-quit");
        }
      })
    );

    // 6. Initialize UI & Boot-Recovery Engine
    this.app.workspace.onLayoutReady(async () => {
      this.initFab();
      if (this.settings.bootAutoRecovery) {
        // Wait 2.5s for obsidian-git to initialize repository
        window.setTimeout(() => this.runBootAutoRecovery(), 2500);
      }
    });
  }

  onVaultChange(type) {
    this.isDirty = true;
    this.isCommittedLocally = false;
    this.syncState = "dirty";
    this.updateFabUI();

    // Fast Local Pre-Commit (commits to local Git in 30ms before exit occurs)
    if (this.settings.localPreCommitSeconds > 0) {
      if (this.preCommitTimer) {
        window.clearTimeout(this.preCommitTimer);
      }
      this.preCommitTimer = window.setTimeout(() => {
        if (this.isDirty && !this.isSyncing) {
          this.triggerLocalPreCommit("fast-timer");
        }
      }, this.settings.localPreCommitSeconds * 1000);
    }
  }

  async triggerLocalPreCommit(source = "manual") {
    if (this.isSyncing || !this.isDirty) return;

    const gitPlugin = this.app.plugins?.getPlugin("obsidian-git");
    if (!gitPlugin) return;

    try {
      console.log(`[GitSync Companion] Running fast local pre-commit (${source})...`);
      // Execute local commit only (takes ~30ms, requires no internet)
      const committed = this.app.commands.executeCommandById("obsidian-git:commit");
      if (!committed && gitPlugin.gitActions?.commit) {
        await gitPlugin.promiseQueue.addTask(() =>
          gitPlugin.gitActions.commit({ fromAuto: true, mode: "all" })
        );
      }

      this.isDirty = false;
      this.isCommittedLocally = true;
      this.syncState = "committed";
      this.updateFabUI();

      // Attempt gentle background push if connected
      this.triggerBackgroundPush();
    } catch (err) {
      console.error("[GitSync Companion] Local pre-commit failed:", err);
    }
  }

  async triggerBackgroundPush() {
    if (this.isSyncing || !this.isCommittedLocally) return;

    const gitPlugin = this.app.plugins?.getPlugin("obsidian-git");
    if (!gitPlugin) return;

    try {
      if (gitPlugin.gitManager?.canPush && (await gitPlugin.gitManager.canPush())) {
        console.log("[GitSync Companion] Pushing local commits in background...");
        this.app.commands.executeCommandById("obsidian-git:push2");
      }
    } catch (e) {}
  }

  async triggerCommitAndSync(source = "manual") {
    if (this.isSyncing) {
      console.log(`[GitSync Companion] Sync already in progress, ignoring trigger from ${source}.`);
      return;
    }

    this.isSyncing = true;
    this.syncState = "syncing";
    this.updateFabUI();

    if (this.settings.hapticFeedback && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch (e) {}
    }

    const gitPlugin = this.app.plugins?.getPlugin("obsidian-git");
    if (!gitPlugin) {
      new Notice("GitSync Companion: 'obsidian-git' is not active.");
      this.isSyncing = false;
      this.syncState = this.isDirty ? "dirty" : "idle";
      this.updateFabUI();
      return;
    }

    try {
      // Execute Obsidian Git Commit-and-sync
      const executed = this.app.commands.executeCommandById("obsidian-git:push");
      if (!executed) {
        if (gitPlugin.gitActions?.commitAndSync) {
          await gitPlugin.promiseQueue.addTask(() =>
            gitPlugin.gitActions.commitAndSync({ fromAutoBackup: source === "lifecycle-exit" })
          );
        } else {
          throw new Error("Unable to trigger obsidian-git sync.");
        }
      }

      this.isDirty = false;
      this.isCommittedLocally = false;
    } catch (err) {
      console.error("[GitSync Companion] Sync failed:", err);
      new Notice(`GitSync error: ${err.message || err}`);
      this.isSyncing = false;
      this.syncState = this.isDirty ? "dirty" : "idle";
      this.updateFabUI();
    }
  }

  async runBootAutoRecovery() {
    const gitPlugin = this.app.plugins?.getPlugin("obsidian-git");
    if (!gitPlugin?.gitManager) return;

    try {
      const canPush = await gitPlugin.gitManager.canPush();
      if (canPush) {
        const unpushedCount = await gitPlugin.gitManager.getUnpushedCommits?.();
        const countText = unpushedCount ? ` (${unpushedCount} commit${unpushedCount > 1 ? "s" : ""})` : "";
        new Notice(`GitSync Companion: Auto-recovering unpushed work${countText}...`, 3000);
        console.log("[GitSync Companion] Boot recovery: unpushed commits detected. Pushing...");
        await this.triggerCommitAndSync("boot-recovery");
        return;
      }

      // Check if working tree was left dirty from an instant swipe-out
      const status = await gitPlugin.gitManager.status();
      if (status && (status.changed.length > 0 || status.staged.length > 0)) {
        new Notice("GitSync Companion: Found uncommitted edits from previous session. Syncing...", 3000);
        console.log("[GitSync Companion] Boot recovery: dirty files detected. Syncing...");
        await this.triggerCommitAndSync("boot-dirty-recovery");
      }
    } catch (err) {
      console.warn("[GitSync Companion] Boot auto-recovery check error:", err);
    }
  }

  onGitRefsChanged() {
    this.isSyncing = false;
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
    fab.setAttribute("aria-label", "GitSync: Tap to Commit & Push");
    fab.innerHTML = ICON_GIT_SYNC;

    const { bottom, right } = this.settings.fabPosition || { bottom: 85, right: 20 };
    fab.style.bottom = `${bottom}px`;
    fab.style.right = `${right}px`;

    let startX = 0;
    let startY = 0;
    let initialBottom = bottom;
    let initialRight = right;
    let isDragging = false;
    const DRAG_THRESHOLD = 8;

    const onTouchStart = (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      const rect = fab.getBoundingClientRect();
      initialBottom = window.innerHeight - rect.bottom;
      initialRight = window.innerWidth - rect.right;
      isDragging = false;
    };

    const onTouchMove = (e) => {
      const touch = e.touches[0];
      const deltaX = startX - touch.clientX;
      const deltaY = startY - touch.clientY;

      if (!isDragging && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
        isDragging = true;
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
      if (!isDragging) {
        this.triggerCommitAndSync("fab-tap");
      } else {
        const rect = fab.getBoundingClientRect();
        this.settings.fabPosition = {
          bottom: Math.round(window.innerHeight - rect.bottom),
          right: Math.round(window.innerWidth - rect.right),
        };
        this.saveSettings();
      }
      isDragging = false;
    };

    fab.addEventListener("touchstart", onTouchStart, { passive: false });
    fab.addEventListener("touchmove", onTouchMove, { passive: false });
    fab.addEventListener("touchend", onTouchEnd, { passive: false });

    fab.addEventListener("click", () => {
      if (!Platform.isMobileApp) {
        this.triggerCommitAndSync("fab-click");
      }
    });

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
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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

    if (this.preCommitTimer) {
      window.clearTimeout(this.preCommitTimer);
    }
    if (this.successResetTimer) {
      window.clearTimeout(this.successResetTimer);
    }

    this.destroyFab();
  }
};

// Settings Tab
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
      text: "High-reliability mobile companion for Obsidian Git. Protects against sudden exit, auto-syncs on app switch, and provides a 1-tap floating quick-sync action button.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Fast local pre-commit delay (seconds)")
      .setDesc("Commits edits locally to the Git database X seconds after typing stops (takes ~30ms, no internet needed). Ensures changes are safely recorded before sudden exit or swipe-out. Set to 0 to disable.")
      .addSlider((slider) =>
        slider
          .setLimits(0, 30, 1)
          .setValue(this.plugin.settings.localPreCommitSeconds)
          .setDynamicTooltip()
          .onChange(async (val) => {
            this.plugin.settings.localPreCommitSeconds = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Boot-time auto-recovery")
      .setDesc("Automatically pushes any unpushed commits or recovers uncommitted edits when Obsidian launches.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.bootAutoRecovery).onChange(async (val) => {
          this.plugin.settings.bootAutoRecovery = val;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Auto-sync on exit / app switch")
      .setDesc("Automatically triggers Git Commit & Push when switching away from Obsidian, pressing Home, or locking the device.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoSyncOnExit).onChange(async (val) => {
          this.plugin.settings.autoSyncOnExit = val;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Show floating action button on mobile")
      .setDesc("Displays a 1-tap draggable sync button on screen with dirty/committed state visual indicators.")
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
      .setName("Haptic feedback on sync")
      .setDesc("Vibrate briefly when tapping the floating sync button.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.hapticFeedback).onChange(async (val) => {
          this.plugin.settings.hapticFeedback = val;
          await this.plugin.saveSettings();
        })
      );
  }
}
