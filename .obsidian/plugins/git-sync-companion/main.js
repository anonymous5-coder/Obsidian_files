const { Plugin, PluginSettingTab, Setting, Notice, Platform } = require("obsidian");

const DEFAULT_SETTINGS = {
  autoSyncOnExit: true,
  showFabOnMobile: true,
  showFabOnDesktop: false,
  fabPosition: { bottom: 85, right: 20 },
  hapticFeedback: true,
  fastDebounceSeconds: 0, // 0 = disabled (uses obsidian-git debounce)
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
    console.log("[GitSync Companion] Loading plugin...");
    await this.loadSettings();

    this.isDirty = false;
    this.isSyncing = false;
    this.fabEl = null;
    this.fastDebounceTimer = null;
    this.successResetTimer = null;

    // 1. Register Settings Tab
    this.addSettingTab(new GitSyncCompanionSettingTab(this.app, this));

    // 2. Register Commands
    this.addCommand({
      id: "sync-now",
      name: "Sync Git now",
      callback: () => this.triggerSync("command"),
    });

    this.addCommand({
      id: "toggle-fab",
      name: "Toggle floating sync button",
      callback: () => this.toggleFab(),
    });

    // 3. Vault Modification Event Listeners
    this.registerEvent(this.app.vault.on("modify", () => this.onVaultChange("modify")));
    this.registerEvent(this.app.vault.on("create", () => this.onVaultChange("create")));
    this.registerEvent(this.app.vault.on("delete", () => this.onVaultChange("delete")));
    this.registerEvent(this.app.vault.on("rename", () => this.onVaultChange("rename")));

    // 4. Hook obsidian-git workspace events
    this.registerEvent(this.app.workspace.on("obsidian-git:refs-changed", () => this.onGitSyncCompleted()));
    this.registerEvent(this.app.workspace.on("obsidian-git:head-change", () => this.onGitSyncCompleted()));

    // 5. App Lifecycle Listeners (Android App Switch, Recents, Screen Lock, Window Blur)
    this.handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && this.settings.autoSyncOnExit && this.isDirty) {
        console.log("[GitSync Companion] App hidden with unsaved changes. Triggering exit sync...");
        this.triggerSync("exit");
      }
    };

    this.handlePageHide = () => {
      if (this.settings.autoSyncOnExit && this.isDirty) {
        console.log("[GitSync Companion] Pagehide event with unsaved changes. Triggering exit sync...");
        this.triggerSync("pagehide");
      }
    };

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("pagehide", this.handlePageHide);

    // Desktop Quit Hook
    this.registerEvent(this.app.workspace.on("quit", () => {
      if (this.settings.autoSyncOnExit && this.isDirty) {
        this.triggerSync("desktop-quit");
      }
    }));

    // 6. Initialize Floating Action Button
    this.app.workspace.onLayoutReady(() => {
      this.initFab();
    });
  }

  onVaultChange(type) {
    this.isDirty = true;
    this.updateFabState();

    // Fast sub-minute debounce (if configured)
    if (this.settings.fastDebounceSeconds > 0) {
      if (this.fastDebounceTimer) {
        window.clearTimeout(this.fastDebounceTimer);
      }
      this.fastDebounceTimer = window.setTimeout(() => {
        if (this.isDirty && !this.isSyncing) {
          console.log("[GitSync Companion] Fast debounce timer elapsed. Triggering sync...");
          this.triggerSync("fast-debounce");
        }
      }, this.settings.fastDebounceSeconds * 1000);
    }
  }

  async triggerSync(source = "manual") {
    if (this.isSyncing) {
      console.log(`[GitSync Companion] Sync already in progress, ignoring trigger from ${source}.`);
      return;
    }

    this.isSyncing = true;
    this.updateFabState();

    // Haptic feedback for touch interaction
    if (this.settings.hapticFeedback && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch (e) {}
    }

    // Check if obsidian-git is installed and enabled
    const gitPlugin = this.app.plugins?.getPlugin("obsidian-git");
    if (!gitPlugin) {
      new Notice("GitSync Companion: 'obsidian-git' plugin is not active.");
      this.isSyncing = false;
      this.updateFabState();
      return;
    }

    try {
      // Execute Obsidian Git's native Commit-and-sync command
      const executed = this.app.commands.executeCommandById("obsidian-git:push");
      if (!executed) {
        // Fallback: direct promise queue trigger if command execution returned false
        if (gitPlugin.gitActions?.commitAndSync) {
          await gitPlugin.promiseQueue.addTask(() =>
            gitPlugin.gitActions.commitAndSync({ fromAutoBackup: source === "exit" })
          );
        } else {
          throw new Error("Unable to locate obsidian-git commit-and-sync routine.");
        }
      }

      // Mark clean on successful command dispatch
      this.isDirty = false;
    } catch (err) {
      console.error("[GitSync Companion] Sync trigger failed:", err);
      new Notice(`GitSync Companion error: ${err.message || err}`);
      this.isSyncing = false;
      this.updateFabState();
    }
  }

  onGitSyncCompleted() {
    this.isSyncing = false;
    this.isDirty = false;
    this.showSuccessFeedback();
  }

  showSuccessFeedback() {
    if (!this.fabEl) return;

    this.fabEl.className = "gitsync-fab gitsync-fab-success";
    this.fabEl.innerHTML = ICON_CHECK;

    if (this.successResetTimer) {
      window.clearTimeout(this.successResetTimer);
    }

    this.successResetTimer = window.setTimeout(() => {
      this.updateFabState();
    }, 2000);
  }

  updateFabState() {
    if (!this.fabEl) return;

    if (this.isSyncing) {
      this.fabEl.className = "gitsync-fab gitsync-fab-syncing";
      this.fabEl.innerHTML = ICON_GIT_SYNC;
    } else if (this.isDirty) {
      this.fabEl.className = "gitsync-fab gitsync-fab-dirty";
      this.fabEl.innerHTML = `${ICON_GIT_SYNC}<div class="gitsync-fab-badge"></div>`;
    } else {
      this.fabEl.className = "gitsync-fab gitsync-fab-idle";
      this.fabEl.innerHTML = ICON_GIT_SYNC;
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

    // Create FAB Element
    const fab = document.createElement("div");
    fab.className = "gitsync-fab gitsync-fab-idle";
    fab.setAttribute("aria-label", "GitSync: Tap to Commit & Push");
    fab.innerHTML = ICON_GIT_SYNC;

    // Apply saved position
    const { bottom, right } = this.settings.fabPosition || { bottom: 85, right: 20 };
    fab.style.bottom = `${bottom}px`;
    fab.style.right = `${right}px`;

    // Touch & Drag Handling
    let startX = 0;
    let startY = 0;
    let initialBottom = bottom;
    let initialRight = right;
    let isDragging = false;
    const DRAG_THRESHOLD = 8; // px

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

        // Clamp to screen boundaries
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
        // Simple tap -> Trigger Sync
        this.triggerSync("fab-tap");
      } else {
        // Save dragged position
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

    // Desktop Mouse Fallback
    fab.addEventListener("click", () => {
      if (!Platform.isMobileApp) {
        this.triggerSync("fab-click");
      }
    });

    document.body.appendChild(fab);
    this.fabEl = fab;
    this.updateFabState();
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

    // Remove lifecycle listeners
    if (this.handleVisibilityChange) {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
    if (this.handlePageHide) {
      window.removeEventListener("pagehide", this.handlePageHide);
    }

    // Clear timers
    if (this.fastDebounceTimer) {
      window.clearTimeout(this.fastDebounceTimer);
    }
    if (this.successResetTimer) {
      window.clearTimeout(this.successResetTimer);
    }

    // Destroy DOM elements
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
      text: "High-reliability mobile companion for Obsidian Git. Auto-syncs on app switch or exit, and provides a 1-tap floating quick-sync action button.",
      cls: "setting-item-description",
    });

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
      .setDesc("Displays a 1-tap draggable sync button on the screen with dirty-state visual indicators.")
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
      .setName("Fast debounce interval (seconds)")
      .setDesc("Automatically triggers sync X seconds after stopping typing (0 to disable, letting Obsidian Git manage debounce). Useful for sub-minute auto-syncs.")
      .addText((text) =>
        text
          .setPlaceholder("0")
          .setValue(String(this.plugin.settings.fastDebounceSeconds || 0))
          .onChange(async (val) => {
            const num = parseInt(val, 10);
            this.plugin.settings.fastDebounceSeconds = isNaN(num) || num < 0 ? 0 : num;
            await this.plugin.saveSettings();
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
