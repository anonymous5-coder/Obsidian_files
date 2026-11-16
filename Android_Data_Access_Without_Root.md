# Blueprint: External App-Data Access & Safety Backup Architecture (`databak`)
**Environment:** Android 15 (SDK 35) | Persistent ADB Transport: `localhost:5555` | Automation: Termux | GUI: ZArchiver + Shizuku
**Document Status:** Audited Technical Blueprint (Pre-Implementation / Revision 3.1 — Closed Technical Specification)

---

## 1. Confirmed Operating Environment & System Architecture

### Scope of Access
* **Primary Targets:**
  * External Application Data: `/storage/emulated/0/Android/data/`
  * External Application OBB: `/storage/emulated/0/Android/obb/`
* **Strict Scope Boundary:** This architecture strictly governs **external application data**. Arbitrary internal private storage (`/data/data/<pkg>`) is strictly out of scope due to Linux kernel UID isolation and is neither assumed, attempted, nor required.
* **Privilege Level:** **Non-root**. Operations execute within standard Android user-space constraints or supported ADB `shell` privileges.

### Core Components & Roles
1. **Persistent ADB Transport (`localhost:5555`):**
   * Configured and persistent across device restarts via existing system mechanisms.
   * **Directive:** Retain existing ADB persistence. Do not redesign transport, initiate new pairing procedures, or alter connection parameters.
   * **Pre-flight Check:** Every operation must verify that `localhost:5555` is online, responsive, and reports `device` state before executing commands.
2. **Termux (CLI Automation Environment):**
   * Command-line orchestrator for backup creation, integrity verification, snapshot management, and Shizuku lifecycle checks.
   * **Critical Access Reality:** ZArchiver’s Shizuku authorization does **not** grant filesystem permissions to the Termux process. Termux operates via the verified ADB transport bridge (`adb -s localhost:5555`) to access external app data. Direct unmediated POSIX access from the Termux app process to other apps' external data is restricted by Android 15 Scoped Storage.
3. **ZArchiver (Primary Visual File Manager):**
   * Interactive GUI for visual browsing, ad-hoc inspection, manual file modifications, mod installation, and archive viewing.
4. **Shizuku (Privilege Provider for GUI):**
   * Supplies elevated binder IPC to ZArchiver, allowing ZArchiver to bypass Scoped Storage file picker restrictions in `Android/data` and `Android/obb`.
   * **Access Qualification:** Actual filesystem access by ZArchiver depends on ZArchiver's internal Shizuku integration, its active client authorization state, platform runtime restrictions, and the specific filesystem operation attempted. The availability of the Shizuku service alone does not guarantee that ZArchiver can successfully access or manipulate every target path.

---

## 2. Shizuku v13.6.0 Startup, Preflight & Verification Model

### Installed Version Information (Previously Reported)
The installed Shizuku installation was previously reported with the following parameters:
* **Package Name:** `moe.shizuku.privileged.api`
* **Version Name:** `13.6.0.r1086.2650830c`
* **Version Code:** `1086`

*(These are treated as previously reported parameters. They are validated via preflight checks rather than assumed as unverified facts).*

### Official v13.6.0 Startup Procedure
As documented in the official [Shizuku v13.6.0 Release Notes](https://github.com/RikkaApps/Shizuku/releases/tag/v13.6.0), the supported startup method executes:
```bash
pm_path=$(pm path moe.shizuku.privileged.api) && apk_path=${pm_path#package:} && $(dirname $apk_path)/lib/*/libshizuku.so
```
Adapted to the persistent ADB transport:
```bash
adb -s localhost:5555 shell "pm_path=\$(pm path moe.shizuku.privileged.api) && apk_path=\${pm_path#package:} && \$(dirname \$apk_path)/lib/*/libshizuku.so"
```

#### Mechanism & Rationale
1. `pm path moe.shizuku.privileged.api` queries the package manager for the installed APK location.
2. `${pm_path#package:}` strips the `package:` prefix to resolve the absolute file path to `base.apk`.
3. `$(dirname $apk_path)/lib/*/libshizuku.so` dynamically resolves the ABI-specific native library path where Shizuku bundles its standalone daemon starter binary on modern Android releases.
4. **Older `start.sh` Inapplicability:** In Shizuku v13.6.0, `start.sh` is not guaranteed to exist on external storage (`/sdcard/Android/data/moe.shizuku.privileged.api/files/start.sh`) and opening the "View Command" UI cannot be assumed to generate it. The release-specific command above is the canonical documented method.

### Separate Preflight Check Requirements
Before executing the startup command, an explicit preflight inspection must verify:
1. **Package Identity:** Confirm `moe.shizuku.privileged.api` is installed and query its version code.
2. **Unambiguous APK Path Resolution:**
   * Run `pm path moe.shizuku.privileged.api`.
   * **Ambiguity Rule:** Require exactly **one** unambiguous applicable base APK path. If `pm path` returns multiple distinct lines (e.g. split APK configurations without a distinguishable base or multi-user paths), the preflight check must **halt immediately** and report the limitation rather than selecting an arbitrary entry or passing combined paths to the command line.
3. **Executable Existence & ABI Suitability:**
   * Evaluate `$(dirname $apk_path)/lib/*/libshizuku.so`.
   * Ensure the wildcard resolves to exactly **one** valid, executable binary matching the device's native ABI (`arm64-v8a`). If the wildcard matches multiple architectures or zero files, halt and report an unsupported configuration.
4. **No Rewriting / No Hard-coding:** Ambiguity must be resolved only through documented platform parameters. Hard-coded `/data/app/...` paths or invented alternative paths are prohibited.
5. **No Execution During Current Task:** Preflight and startup commands are specified here for implementation design; they are not executed during this documentation task.

### Distinct Service & Access Verification Layers
Verification strictly distinguishes 5 distinct layers:
1. **Startup Command Execution:** Process exit status of the startup command.
2. **Process Existence:** Presence of `shizuku_server` under the `shell` UID (UID 2000):
   ```bash
   adb -s localhost:5555 shell "ps -ef | grep -E '[s]hizuku_server'"
   ```
3. **Binder Liveness:** Validated via the official API method `Shizuku.pingBinder()` through an already-installed compatible client (Reference: [rikka.shizuku.Shizuku.java](https://github.com/RikkaApps/Shizuku-API/blob/master/api/src/main/java/rikka/shizuku/Shizuku.java)).
   * *Critical Constraint:* `Shizuku.pingBinder()` is an Android Java API method, not a standalone shell CLI command. It does not establish client authorization or filesystem access permissions. (No diagnostic client is to be installed or developed during this task).
4. **Client Authorization:** Specific permission (`moe.shizuku.manager.permission.API_V23`) granted by the user to the client (e.g. ZArchiver) in the Shizuku manager interface.
5. **Target Operation Execution:** Verification that the authorized client can successfully read, write, or list the target external app directory.

### Independent Startup Outcome & Canonical Service Status
Startup-command outcome and actual Shizuku service status are reported independently:

#### 1. Startup-Command Outcome
* **`SUCCESS`:** The startup command was executed and returned a successful exit status (exit code 0).
* **`FAILED`:** The startup command was executed but failed, was terminated, or returned a non-zero exit status.
* **`NOT_RUN`:** The startup command was not executed during the relevant operation (e.g. preflight checks failed or the service was already confirmed active).

#### 2. Shizuku Service Status
* **`SUCCESS`:** Defined solely by independently verified Binder liveness through a documented compatible client. Startup does not have to have been executed during the current operation. An already-running, Binder-responsive service can therefore be `SUCCESS` while startup outcome is `NOT_RUN`. This status applies only to the recorded observation time and does not imply uninterrupted or continuing service availability after that observation.
* **`FAILED`:** Requires affirmative evidence establishing actual service unavailability, termination, or failure. A failed startup attempt, lack of a process check, or a process-not-found observation that does not independently establish actual service unavailability must not, by itself, establish service failure. A process-not-found observation must be evaluated in the context of the reliability, scope, and timestamp of that observation. Binder liveness, when independently verified through a documented compatible client, establishes `SUCCESS` for that observation time. If a process observation appears to conflict with independently verified Binder liveness, do not classify the service as `FAILED` solely from the process observation; record both observations with their timestamps and evidence sources; independently verified Binder liveness establishes `SUCCESS` at its observation time. A `FAILED` service status applies to the supported observation time and evidence scope; it does not establish that the service cannot subsequently become available. A later independently verified Binder-liveness observation may establish `SUCCESS` for that later observation time.
* **`SERVICE_STATUS_UNVERIFIED`:** Used whenever available evidence is insufficient to establish either service success or failure. This includes cases where neither startup nor process status has been checked; cases where startup evidence exists but Binder liveness has not been independently verified and no independent affirmative evidence establishes service failure; and cases where process evidence exists but its reliability, scope, or timestamp is insufficient to establish actual service unavailability. Do not classify a service as `SERVICE_STATUS_UNVERIFIED` merely because Binder liveness was not checked if other reliable, affirmative evidence independently establishes service failure (in that case, classify the service as `FAILED` for the supported observation time).

Status must reflect the evidence for the relevant observation time, recording observation timestamps and evidence sources. If evidence conflicts or refers to different observation times, do not combine it into an unsupported status; report the latest adequately supported state and retain the earlier evidence. Client authorization and target-operation results must always be reported separately from service status.

---

## 3. Empirical Access Findings, Reproducible Evidence & Staging Validation

### Empirical Access Findings & Scope Boundaries
* **Direct Termux Access Finding:** The two tested direct Termux operations against protected target directories (Steps 2a and 9a) failed with permission denied on the tested Android 15 device and configuration. In contrast, Step 1's parent-directory metadata read succeeded, and Steps 5–8's local staging operations on retrieved files succeeded in Termux. Other direct Termux operations retain their recorded status, including `NOT TESTED` where applicable. This is an empirical finding for this environment, not proof that all Android 15 devices behave identically. Android platform Scoped Storage policy restricts standard unprivileged app UIDs from directly accessing other applications' external package directories under FUSE; this platform-policy context explains the tested behavior but is kept distinct from the specific empirical test outcomes.
* **ADB Transport Finding:** The synthetic-target ADB-mediated operations passed on the tested device. This demonstrates that ADB shell (UID 2000) can interact with external app data on this environment; it does not constitute direct Termux filesystem access, nor does it establish universal compatibility across all Android 15 devices, real application packages, OBB directories, file types, or metadata configurations.

### Evidence Ledger & Test Classification (Synthetically Tested on 2026-11-13)
* **Test Timestamp:** 2026-11-13T09:41:19Z
* **Transport Method:** Persistent ADB bridge on `localhost:5555`
* **Synthetic Target Path:** `/storage/emulated/0/Android/data/synthetic.test.pkg/`
* **Local Staging Path:** Termux internal scratch directory
* **Evidence Preservation Note:** The evidence ledger below preserves actual recorded commands verbatim as executed during the 2026-11-13 test session, including abbreviations and ellipses where originally recorded. Actual recorded commands are reproduced verbatim without reconstructing or expanding missing arguments. Step 10 is a descriptive operation record whose exact command was not preserved in the available test log; it is preserved as an operation record and is not presented as a command.

| Test Step | Execution Context & Nature of Operation | Preserved Command / Descriptive Operation Record | Exit Code | Result State | Recorded Output & Checksums |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | Direct Termux (Parent directory metadata read) | `ls -ld /storage/emulated/0/Android/data` | `0` | **PASS** | `drwxrws--x 486 media_rw ext_data_rw 53248` |
| **2a** | Direct Termux (Protected target directory enumeration) | `ls /storage/emulated/0/Android/data` | `2` | **FAIL** | `ls: cannot open directory: Permission denied` |
| **2b** | ADB-mediated (Target directory enumeration) | `adb -s localhost:5555 shell "ls /storage/emulated/0/Android/data"` | `0` | **PASS** | Enumerated package directories. |
| **3** | ADB-mediated (Target file read) | `adb -s localhost:5555 shell "cat .../files/subdir/test_file.txt"` | `0` | **PASS** | Content: `DISPOSABLE TEST PAYLOAD 123456789` |
| **4** | ADB-mediated (Target file streaming to staging) | `adb -s localhost:5555 exec-out "cat .../test_file.txt" > staging/test_file.txt` | `0` | **PASS** | Streamed file to local staging without corruption. |
| **5** | Termux Local Staging (File checksum calculation) | `sha256sum staging/test_file.txt` | `0` | **PASS** | SHA-256: `0e0f2f512513e7a533c58934b17b43c0b46569828216ed0511e2d3a5aeeaedbe` |
| **6** | Termux Local Staging (Archive packaging) | `tar -czf staging/test_archive.tar.gz -C staging test_file.txt` | `0` | **PASS** | Created archive (164 bytes, low compression). |
| **7** | Termux Local Staging (Archive structure verification) | `tar -tzvf staging/test_archive.tar.gz` | `0` | **PASS** | Validated structure; entry: `test_file.txt` (34 bytes). |
| **8** | Termux Local Staging (Extraction & roundtrip compare) | `cmp staging/test_file.txt staging/extracted/test_file.txt` | `0` | **PASS** | Roundtrip extraction: byte-for-byte exact match. |
| **9a** | Direct Termux (Protected target directory creation) | `mkdir -p /storage/emulated/0/Android/data/com.synthetic.test` | `1` | **FAIL** | `mkdir: cannot create directory: Permission denied` |
| **9b** | ADB-mediated (Target file write) | `adb -s localhost:5555 shell "echo ... > .../roundtrip.txt"` | `0` | **PASS** | Wrote test payload into synthetic directory. |
| **10** | Dual: Remote (ADB Shell) & Local Termux Checksum Comparison | Comparison of remote ADB checksum against local Termux SHA-256 (exact command not preserved) | `0` | **PASS** | Both: `9a9545c6484dfba14297602b4b1be8ec92cca256bfad97189d8ad619ec34baab` |
| **Clean** | ADB-mediated (Target directory removal) | `adb -s localhost:5555 shell "rm -rf .../synthetic.test.pkg"` | `0` | **PASS** | Synthetic directory removed; verified non-existent (`code 1`). |

#### Classification Summary of Results:
1. **Direct Termux Operations Against Protected Target Directories:** The two operations tested against unowned external package paths—Step 2a (protected directory enumeration) and Step 9a (protected directory creation)—failed (`FAIL`, Permission denied) on this tested Android 15 environment.
2. **Direct Termux Parent Metadata Read:** Step 1 succeeded (`PASS`) reading metadata of `/storage/emulated/0/Android/data`.
3. **ADB-Mediated Target Operations (Steps 2b, 3, 4, 9b, Clean):** Successfully executed (`PASS`) through the persistent ADB shell bridge.
4. **Termux Processing of Local Staging Files (Steps 5, 6, 7, 8):** Successfully executed (`PASS`) inside the local Termux staging environment on files previously retrieved via ADB.
5. **Dual Checksum Comparison (Step 10):** Successfully executed (`PASS`) as a comparison between a remote ADB-executed `sha256sum` and a local Termux calculation.

### ZArchiver Access & Manual Staging Validation Requirements
ZArchiver/Shizuku access and manual ZArchiver-to-Termux staging are independent of ADB-mediated access. Manual staging cannot be considered verified based on proposal alone. Its future validation requires complete roundtrip testing:
1. **Stage 1 (ZArchiver $\rightarrow$ Staging):** Transfer disposable test data from `Android/data` to a Termux-accessible staging directory (`/sdcard/Documents/Staging/`) using ZArchiver. *(Status: **NOT TESTED**)*.
2. **Stage 2 (Staging Ingestion):** Read and calculate SHA-256 of staged data in Termux. *(Status: **NOT TESTED**)*.
3. **Stage 3 (Staging $\rightarrow$ Target):** Transfer data back into a disposable test target in `Android/data` using ZArchiver. *(Status: **NOT TESTED**)*.
4. **Stage 4 (Target Verification):** Read back target data and compare SHA-256 against baseline. *(Status: **NOT TESTED**)*.

*(Execution of this manual roundtrip validation is deferred to authorized implementation phases).*

---

## 4. Backup Scope, Target Identity & Selection Specifications

### Storage Scope Definitions
* External Application Data: `/storage/emulated/0/Android/data/<package>/`
* External Application OBB: `/storage/emulated/0/Android/obb/<package>/`

### Selection Interface & Scope Types
`databak` supports three unambiguous scope types:
1. **Scope A: Selected Subpaths:**
   * Specified relative to the package root.
   * Command: `databak snap <package> <label> --root data --paths "files/saves,files/config.json"`
2. **Scope B: Complete Package `Android/data`:**
   * Captures the entire accessible `Android/data/<package>/` directory.
   * Command: `databak snap <package> <label> --data`
3. **Scope C: Complete Package `Android/obb`:**
   * Captures the package's OBB directory (`Android/obb/<package>/`).
   * Command: `databak snap <package> <label> --obb`

### Deterministic Cache Matching & Scope Rules
* **Explicit, Conservative Cache Matching (`Android/data` only):**
  * Default `--data` captures all accessible entries within the selected scope, excluding directories named **exactly** `cache` or `code_cache` **only when they occur directly under the package root** (e.g. `Android/data/<package>/cache` and `Android/data/<package>/code_cache`).
  * Nested directories named `cache` or `code_cache` elsewhere in the hierarchy (e.g. `files/cache` or `files/mods/cache`) are **not** automatically excluded.
  * **Strict Exclusion Invariant:** `no_backup/` is **never** classified as cache; it is included by default.
  * All other accessible entries are included by default unless another explicitly documented exclusion applies.
* **`--include-cache` Flag:** Overrides the default cache exclusion, forcing inclusion of root-level `cache` and `code_cache` directories.
* **Precedence Rule:** Cache exclusions are evaluated against package-root-relative paths regardless of the selected backup scope. Explicitly specifying a path inside an excluded cache directory does not override the exclusion; `--include-cache` is strictly required to include it.
* **OBB Scope Policy:** Cache exclusion matching and policies are strictly **Not Applicable** (`N/A`) for `Android/obb` scopes. Selected OBB contents are treated as backup payload; OBB files are not assumed to be immutable nor excluded on that basis.
* **Non-Expansion Invariant:** A selected subpath scope will **never** silently expand into a broader scope.
* **Manifest Reporting of Excluded & Inaccessible Paths:**
  * Every skipped, excluded, or inaccessible path must have an explicit recorded reason and classification in the manifest:
    - `INACCESSIBLE_ENTRY`
    - `UNENUMERABLE_PARENT_DIRECTORY`
    - `CACHE_EXCLUSION`
    - `UNSUPPORTED_FILE_TYPE`
    - `INTENTIONALLY_SKIPPED`
  * If a parent directory cannot be enumerated, the manifest records the inaccessible parent scope and enumeration limitation; child entries are **never fabricated**. The snapshot result state is marked `PARTIAL`.
* **Restoration Isolation:** An exact-scope restoration must **never** delete or modify paths that were excluded from the corresponding snapshot.

### Exact Target Identity
Each recovery point is identified by the complete combination of:
$$\text{Target Identity} = \langle \text{Package Name}, \text{Storage Root [data | obb]}, \text{Normalized Relative Paths}, \text{Cache Policy} \rangle$$

Target identity governs all baseline, recent-point, and pinning logic. Package name alone is never used as the organizational key.

---

## 5. Source Consistency, Manifest Schema & Verification Model

### Source Consistency vs Archive Integrity
* **Archive Integrity:** Verifies that the resulting `.tar.gz` is well-formed and matches its archive-level checksum.
* **Source Consistency:** Evaluates whether files changed during capture. Source file metadata (mtime, size) is sampled before and immediately after archive creation, combined with content/checksum checks where practical.
* **Real-World Limitation:** These checks are best-effort. In the absence of filesystem-level snapshotting or cooperative application freezes, atomic point-in-time consistency cannot be guaranteed. Snapshots must never be represented as guaranteed atomic backups.
* **Change Detection:** Any file detected to have changed during archive creation is recorded in the manifest, and the snapshot status is downgraded to `PARTIAL`.

### Three-Stage Verification Model & Result Reconciliations
Verification stages must be executed and their actual outcomes recorded to the extent possible. They must not all be described as necessarily passing for every publishable snapshot:
1. **Stage 1 — Archive Integrity:** Read and test archive structure (`tar -tzvf <archive>` returns exit code 0). Mandatory check for all usable snapshots.
2. **Stage 2 — File Integrity:** Verify extracted stream checksums against recorded pre-capture checksums where available.
3. **Stage 3 — Scope Completeness:** Reconcile source inventory against actual archive entries. Scope-completeness verification may accurately identify an incomplete scope, resulting in `PARTIAL` rather than a successful completeness result. An incomplete scope must not be silently treated as a successful completeness result merely to satisfy publication.

#### Distinguishing Mandatory Artifact Integrity from Capture Completeness
* **Mandatory Artifact Integrity Failure:** A failure of a mandatory artifact-integrity check (Stage 1 archive structure or mandatory checksum validation) prevents publication as a completed usable snapshot. If the failure belongs to capture-integrity validation, the capture result must be `FAILED`.
* **Capture Completeness & Source Consistency:** Scope-completeness and source-consistency checks determine whether the capture result is `SUCCESS` or `PARTIAL`. An accurately identified incomplete scope or detected source change results in `PARTIAL` without invalidating an otherwise structurally sound and integrity-verified archive.
* **Prohibitions:** A failed mandatory integrity check must never be classified as merely `PARTIAL` to permit publication. A successfully detected scope omission must never be classified as an integrity failure merely because capture was incomplete.

### Snapshot Result States
* **`SUCCESS`:** The declared capture scope was completely captured, and all required integrity, checksum, and completeness checks passed. *(Not a guarantee of atomic consistency).*
* **`PARTIAL`:** Archive was created and passed mandatory artifact integrity, but one or more required entries, access operations, source-consistency checks, or declared capture-verification criteria could not be fully satisfied (e.g. file changed during capture, locked file, inaccessible directory).
* **`FAILED`:** No usable verified capture archive was produced, a mandatory capture-integrity requirement failed, or the capture process aborted without producing a usable artifact.

### Metadata Handling & Storage Realities
Metadata handling strictly distinguishes between three states without making unsupported universal generalizations about underlying storage:
1. **Observed Metadata:** Attributes observed at the source filesystem.
2. **Archived Metadata:** Attributes stored in the `.tar.gz` header (standard POSIX timestamps, file modes).
3. **Restorable Metadata:** Attributes demonstrably restorable on the destination filesystem.
   * *Explicit Limitation:* Android shared/emulated external storage implementations frequently restrict preservation of Linux UID/GID ownership, SELinux security contexts, or extended attributes (`xattrs`). These are never promised as restorable unless specific source-to-destination capability has been established.
   * *Status Classification:* In manifest records, `NOT_VERIFIED` is assigned when an attribute's restoration capability has not been adequately verified or available evidence is insufficient. `NOT_APPLICABLE` is assigned only when there is a supported basis for establishing that the attribute genuinely does not apply. One state is never used as a substitute for the other.
   * *Schema Field Name Compatibility:* The schema field `metadata_limitations` is retained to preserve schema compatibility with documented blueprint references. Its `NOT_VERIFIED` entries represent unresolved metadata-verification states, not confirmed restoration limitations or established restoration failures.

### Symbolic Links & Comprehensive Extraction Safety
* **Relative Symbolic Link Restriction:** Only relative symbolic links may be preserved, and only when their resolved targets and every link in their complete resolution chains remain inside the declared root:
  - During capture, links and chains are validated against the declared backup root.
  - During restoration, links and chains are validated against the declared restoration target root.
  - Absolute symbolic links, escaping links, links with escaping resolution chains, and unsupported link configurations are strictly rejected.
  - A symbolic link whose complete resolution chain cannot be reliably established must not be preserved or recreated. This includes cyclic or dangling chains, inaccessible resolution targets, and resolution results that cannot be validated reliably. These are treated as unsupported/unsafe configurations; the extraction engine fails closed before modifying the restoration target.
* **Continuous Confinement Throughout Extraction:**
  - Extraction validation addresses absolute paths, parent traversal (`..`), hard links, symlink chains, duplicate/conflicting entries, and pre-existing destination symlinks.
  - No archive member or extraction operation may write outside the declared restoration target root, including through links already present in the destination.
  - Destination paths and link targets must be revalidated during extraction to prevent path substitution and time-of-check/time-of-use (TOCTOU) symlink redirection.
  - Use no-follow handling for destination path components where supported.
  - Hard links must be validated independently; targets escaping the declared root are rejected.
  - Duplicate or conflicting archive entries are rejected.
  - Special filesystem objects (device nodes, sockets, FIFOs) are strictly ignored and never recreated.
  - If confinement cannot be guaranteed under the available filesystem and extraction implementation, the operation must **abort before modifying the target**.

### Manifest Schema (`manifest.json`)
The manifest records full metadata and verification records:
```json
{
  "manifest_version": "1.0.0",
  "snapshot_id": "com.example.game_data_20261113_153000_pre_mod",
  "target_identity": {
    "package_name": "com.example.game",
    "storage_root": "data",
    "selected_paths": ["files/saves", "files/settings.json"],
    "cache_policy": "EXCLUDE_CACHE"
  },
  "app_version_name": "1.4.2",
  "timestamp_iso": "2026-11-13T15:30:00Z",
  "archive_filename": "snapshot.tar.gz",
  "archive_size_bytes": 10485760,
  "archive_sha256": "<actual-64-character-sha256>",
  "pinned": false,
  "result_state": "SUCCESS",
  "metadata_limitations": [
    "UID_GID_RESTORATION_NOT_VERIFIED",
    "SELINUX_CONTEXT_RESTORATION_NOT_VERIFIED",
    "XATTR_RESTORATION_NOT_VERIFIED"
  ],
  "inaccessible_paths": [],
  "skipped_paths": [
    {
      "path": "cache",
      "reason": "CACHE_EXCLUSION"
    }
  ],
  "changed_during_capture": [],
  "inventory": [
    {
      "relative_path": "files/saves/slot1.sav",
      "size_bytes": 4096,
      "mtime_epoch": 1794553098,
      "sha256": "<actual-64-character-sha256>"
    }
  ]
}
```
*Note: SHA-256 is utilized strictly for corruption detection and integrity verification; it is not presented as cryptographic authentication or tamper-proofing.*

---

## 6. Snapshot Publication, Storage Accounting & Retention Policy

### Dedicated Repository Structure & Publication Protocol
Snapshots reside strictly outside the target application hierarchy:
```
/storage/emulated/0/Documents/Backups/AppData/<package_name>/<snapshot_id>/
├── snapshot.tar.gz
├── snapshot.tar.gz.sha256
├── manifest.json
├── verification.json
└── .published
```

#### Dual Publication Paths & Completion Marker Protocol
* **Marker File Definition:** The explicitly named file `.published` serves as the authoritative publication completion marker.
* **Destination Collision & Overwrite Prohibition:** If the final destination directory path (`<package_name>/<snapshot_id>/`) already exists—regardless of whether `.published` exists, is missing, or is corrupted—`databak` must immediately abort publication to that destination. An existing final snapshot directory must never be overwritten, appended to, or implicitly reused. Resuming or cleaning up an interrupted publication requires a separately defined, validated recovery procedure—not implicit reuse.
* **Distinguishing Publication Completion from Capture Result:**
  - The completion marker indicates successful completion of the publication process; it does not define or alter the capture result state (`SUCCESS` vs `PARTIAL`).
  - A failure or interruption of the publication process after a usable capture artifact has been successfully produced must not automatically change the previously established capture result state from `SUCCESS` or `PARTIAL` to `FAILED`. In such cases, the established capture result state is preserved, and publication is classified separately as incomplete, interrupted, or failed. No completion marker is created, and the unpublished artifact is not presented as a completed recovery point.
  - Distinguish capture integrity from publication integrity: A failure of mandatory capture integrity establishes `FAILED`. A failure of mandatory publication integrity means publication cannot receive a completion marker; it does not retroactively change an earlier established capture classification unless evidence independently establishes that capture integrity also failed.
* **Requirements Before Marker Creation:**
  1. All required snapshot components completely written (`snapshot.tar.gz`, `manifest.json`, `snapshot.tar.gz.sha256`).
  2. All applicable verification stages executed to the extent possible, and actual outcomes recorded.
  3. Mandatory publication-integrity requirements pass (archive structure validity, checksum validation, and internal consistency between archive, manifest, checksums, and verification records). Staging artifact before verified atomic rename, or transferred final-destination artifact after fallback copying. Staging verification alone is never accepted as a substitute for final-destination verification in the fallback copy protocol.
  4. Scope-completeness results accurately recorded in the manifest.
  5. Associated verification records completely written and persisted (`verification.json`). Documented capture limitations contributing to a `PARTIAL` result do not prevent publication when mandatory artifact-integrity and publication requirements pass.
* **Two Supported Publication Paths:**
  - *Path A (Verified Atomic Directory Rename):* Where supported and verified on the filesystem, the completion marker is prepared inside `.staging_<snapshot_id>/` only after all components, records, and publication-integrity checks pass. The marker becomes authoritative for discovery only when the entire staging directory is atomically renamed (`mv`) to `<snapshot_id>/`. If rename fails or is interrupted, the staging directory is not discoverable as a published snapshot.
  - *Path B (Fallback Copy-Based Protocol):* Where atomic rename is unsupported or unverified, components are copied to the final destination directory. The final destination copies and records are verified post-transfer; `.published` is created directly in the final destination directory only after those post-transfer checks pass.
* **`PARTIAL` Publication Eligibility:** A snapshot with result state `PARTIAL` may receive a completion marker if its publication completed, its archive passed mandatory publication integrity, and its manifest/verification records are complete and consistent. The snapshot strictly remains `PARTIAL`; marker creation never upgrades it to `SUCCESS`. A snapshot with result state `FAILED` must never receive an authoritative completion marker.
* **Historical Marker Invariant:** If a published snapshot is later found corrupted, historical publication evidence is preserved, but the artifact is classified as currently invalid/unusable. A historical marker does not override a subsequent integrity failure or establish current restoration eligibility.
* **Temporary Staging Cleanup Rules:** Cleanup may affect **only identifiable, tool-owned temporary staging artifacts** (`.staging_*`). Cleanup must never silently delete existing snapshots or unrelated files. Incomplete artifacts must never appear as completed recovery points. Sufficient diagnostic state is preserved upon interruption.

#### Snapshot Discovery and Classification Requirements
Snapshot discovery must validate the completion marker (`.published`) and its associated records before recognizing a publication as completed:
1. **Deterministic Identity Contract:** Discovery must validate that:
   - The directory's package path component matches the manifest's `target_identity.package_name`.
   - The directory basename matches the manifest's `snapshot_id`.
   - The verification record (`verification.json`) explicitly references the exact same `snapshot_id`, manifest SHA-256, and archive SHA-256.
   - The completion marker (`.published`) is present in the final directory and associated with that exact publication.
   - Missing, mismatched, or malformed identity information makes the publication invalid and non-discoverable as a usable recovery point.
2. **Three-Way Publication Classification:** Discovery must distinguish:
   - A fully published `SUCCESS` snapshot.
   - A fully published but incomplete `PARTIAL` snapshot.
   - An interrupted, invalid, or failed publication.
3. **Location Isolation (Final Locations Only):** Discovery must search **only designated final snapshot locations**, never temporary staging directories (`.staging_*`). A marker found inside a temporary staging directory must never make that staging directory discoverable as a published snapshot.
4. **Distinguishing Publication Completion from Current Integrity & Restoration Eligibility:** Discovery validates that the publication process finished and required records exist; it does not represent an artifact as currently integrity-verified or restoration-eligible. Independent re-validation of archive integrity, checksums, manifest consistency, and restoration eligibility gates remains strictly required when the snapshot is inspected or considered for restoration.
5. **Handling Incomplete or Failed Publications:** An interrupted publication, a publication missing required components or associated records, or an invalid publication must remain distinguishable from a completed publication and must never be presented as a usable completed recovery point.

### Rigorous Storage Accounting (Two Independent Calculations)

#### Calculation A: Retained Repository Footprint
* **Components Included:**
  1. Retained published snapshots and their archives.
  2. Snapshot manifests and metadata.
  3. Checksums and persisted verification records (`verification.json`).
  4. Repository restoration journals (`restore-journals/`).
  5. Other retained repository operational metadata.
* **Warning Threshold Evaluation:**
  - The initial cumulative **2.0 GB** threshold applies to this defined retained repository footprint across all packages. It is a warning threshold, not a hard limit or automatic deletion trigger.
  - Evaluated pre-operation as:
    $$\text{Projected Retained Footprint} = \text{Existing Retained Footprint} + \text{New Snapshot's Projected Retained Footprint}$$
  - Temporary copies are not included in this threshold calculation unless they are retained as repository content.
  - **Explicit Boundary Rule:** If the projected retained repository footprint is greater than or equal to 2.0 GB ($\ge 2.0\text{ GB}$), `databak` must warn the user and require explicit user approval before proceeding.
  - **Pre-Publication Re-evaluation:** `databak` re-evaluates the projected retained repository footprint immediately before publication using the actual retained snapshot size and current repository contents. If the updated projection is greater than or equal to 2.0 GB ($\ge 2.0\text{ GB}$) and explicit approval was not already obtained for that projected amount, `databak` must pause and obtain explicit approval before proceeding with publication.
  - The threshold never operates as an absolute storage cap or automatic deletion trigger.

#### Calculation B: Peak Working-Space Requirement
* **Components Included:** Actual temporary staging buffers, intermediate files, verification/extraction workspace, and any simultaneous copies required by the pipeline.
* **Per-Filesystem Capacity Evaluation:**
  - Evaluated separately for every participating filesystem against actual free space before starting the operation. Free space on one filesystem is never treated as available capacity on another.
  - Space accounting strictly avoids double-counting physical files (e.g. a same-filesystem atomic rename does not duplicate physical data).
  - Where exact working-space requirements depend on data not yet available, requirements are derived from known source inventory, documented pipeline rules, and temporary-file lifetime rules (estimates are never represented as exact measurements).
  - **Explicit Fail-Closed Condition:** If sufficient working space cannot be established from the available information and supported calculations, the operation **must not begin**. Arbitrary fixed multipliers (such as $2.2\times$) must not substitute for actual pipeline, temporary-file lifetime, and filesystem calculations. Available capacity is reassessed before any later stage whose working-space requirement could exceed the initial allowance.

### Retention Policy Invariants
* **Baseline Snapshots:** 1 initial baseline per unique target identity. Kept indefinitely as the reference state.
* **Recent Recovery Points:** 3 rolling recovery points per target identity. This is an **organizational guideline**, not an automated deletion trigger.
* **Pinned Snapshots:** Pinned via `databak pin`; permanently exempt from retention cleanup.
* **Zero Automatic Deletion:** `databak` **never automatically deletes older snapshots**. Any future cleanup must be an explicit, separately authorized operation with full deletion previews.

---

## 7. Restoration Engine, Safety Gates & Durable Journaling

### Dual Restoration Modes & Strict Eligibility

#### Snapshot Eligibility Gates
* **Exact Restoration Eligibility:** Strictly **prohibited** from snapshots whose result state is `PARTIAL` or `FAILED`. Exact restoration requires all of the following:
  1. The source snapshot has result state `SUCCESS`.
  2. Archive integrity and checksum are re-verified before restoration.
  3. Snapshot target identity matches the intended destination.
  4. The complete current target scope can be enumerated.
  5. A complete preview of proposed creations, overwrites, and deletions is generated.
  6. A verified pre-restoration safety snapshot is created for the exact target scope.
  7. Separate, explicit confirmation is obtained before exact-mode modifications and deletions.
  *(If any prerequisite cannot be satisfied, restoration aborts immediately before modifying the target).*
* **Partial Overlay Acknowledgement:**
  - Overlay restoration from a `PARTIAL` snapshot requires explicit disclosure of the incomplete source state and separate user acknowledgement before proceeding. It must never be silently treated as a complete recovery point.
  - Snapshots with result state `FAILED` are **never eligible** for restoration under any mode.

#### Mode Definitions
1. **Safe Overlay Mode (`--overlay`, Default):**
   * Restores all entries contained in the selected snapshot into the target destination.
   * For every path present in the archive, the target destination file is overwritten with the archived version, regardless of the relative timestamps of existing target files.
   * Target destination files whose paths are absent from the snapshot (such as unarchived files created after the snapshot was taken) are left untouched and preserved.
   * Does not delete or prune any destination files.
2. **Exact-Scope Rollback Mode (`--exact`):**
   * Reconciles the target scope to match the snapshot state exactly.
   * Requires establishing an inventory of the current target scope prior to execution. If target directory enumeration fails or is incomplete, exact restoration **aborts immediately**.
   * Generates a complete preview of every proposed overwrite, creation, and deletion.
   * Requires **separate, explicit confirmation** before deleting any newer files.
   * **Boundary Invariant:** Never modifies or deletes paths that were excluded from the snapshot (e.g. excluded cache paths) or paths outside the declared scope.

### Pre-Restoration Safety Requirements
Before modifying any target files, `databak` enforces:
1. **Archive Re-Verification:** Verify `.tar.gz` integrity and sidecar SHA-256.
2. **Scope Matching Check:** Verify that snapshot metadata target identity matches the target destination.
3. **Active Application Check:** Check if the app is active (`pidof <package>`). Warn user; offer force-stop (`am force-stop`) **only** with explicit confirmation.
4. **Mandatory Safety Snapshot:** Automatically create and verify a safety snapshot (`pre_restore_<timestamp>`) of the exact target scope. If the safety snapshot fails or cannot be verified, **restoration halts immediately**.
5. **Non-Interactive Abort:** Non-interactive execution must abort immediately if required confirmations are missing.

### Durable Restoration Journaling & Snapshot Immutability
* **Journal Location & Relocation Rationale:** Restoration journals are stored outside individual snapshot directories in a dedicated repository-level directory:
  ```
  /storage/emulated/0/Documents/Backups/AppData/restore-journals/<restore_id>.json
  ```
  *Baseline Comparison & Rationale:* In Revision 2 of the blueprint, restoration journals were located at `<snapshot_id>/restore_journal_<timestamp>.json` (inside individual snapshot directories). Relocating journals to a separate repository-level directory (`restore-journals/`) was mandated by the user in Revision 3 to enforce that published snapshot directories (`<package_name>/<snapshot_id>/`) remain strictly **immutable**. Restoration operations never write to, append to, or modify published snapshot directories, manifests, archives, or verification records.
* **Snapshot Immutability:** Published snapshot contents (archives, manifests, checksums, verification records) remain strictly **immutable**. Restoration operations never write to or modify published snapshot directories.
* **Write-Ahead Intent Logging:** The journal must be durably updated to record the operation's intent (operation type, target relative path, pre-mutation state) before modifying or deleting the target file.
* **Completion Logging:** The operation's completion (including post-mutation verification) is persisted to the journal only after the modification and any required verification finish.
* **Atomic & Durable Journal Updates:** Journal updates must be written safely (via fsync and atomic temporary-file replacement or durable append) so interrupted writes or sudden power loss cannot silently corrupt the last valid journal state.
* **Detection of Truncated/Malformed Journals:** Upon recovery or restart, `databak` must validate journal integrity. If the journal is truncated, malformed, or internally inconsistent, the recovery process must fail closed and report the condition rather than making assumptions about the restoration state.
* **Crash Recovery Differentiation:** The recovery engine reads the journal to unambiguously distinguish an operation that never started (recorded as planned but not started) from one that was in progress and may have partially modified the target (recorded as started but not completed).
* **Interruption Handling:** If restoration is interrupted, `databak` reads the journal to report:
  * Last recorded operation.
  * Completed operations vs unattempted operations.
  * Exact affected scope.
  * Verification status and path of the `pre_restore` snapshot.
  * Concrete manual and automated recovery instructions.
* *Honesty Boundary:* Restoration is not described as transactional rollback or atomic replacement; recovery is provided through the verified pre-restoration snapshot.

---

## 8. CLI Command Interface

```bash
# System status & transport readiness
databak status

# Snapshot creation (explicit scope required)
databak snap <package> <label> --data [--include-cache]
databak snap <package> <label> --obb
databak snap <package> <label> --root data --paths "<path1>,<path2>" [--include-cache]

# Inventory, inspection & verification
databak list <package>
databak inspect <package> <snapshot_id>
databak verify <package> <snapshot_id>

# Snapshot lifecycle pinning
databak pin <package> <snapshot_id>
databak unpin <package> <snapshot_id>

# Restoration
databak restore <package> <snapshot_id> [--overlay | --exact]
```
*(Commands `databak purge` and `databak delete` are excluded from the initial specification; any future cleanup capability requires a separate specification with explicit deletion previews).*

---

## 9. Application Consistency & Operational Boundaries

* **Internal State Exclusion:** Application databases, credentials, shared preferences, cryptographic salts and other cryptographic material may reside in private application storage (`/data/data/<pkg>`). Cryptographic keys may be managed or protected through the Android Keystore, including hardware-backed implementations. The precise arrangement varies by application; Android Keystore is not a general storage location for application databases or shared preferences. This external-data backup architecture does not capture private application state or guarantee restoration of credentials or cryptographic keys.
* **Cloud Synchronization:** Applications utilizing cloud sync (e.g. Google Play Games) may detect rollbacks as older timestamps and overwrite restored external files.
* **Version Incompatibilities:** Application updates may alter file schemas; restoring older external files to a newer app version may cause crashes or data rejection.
* **Device-Bound Encryption:** Where external files depend on device-bound keys that are unavailable on another device, copying the files alone does not make them decryptable on that device. The actual outcome depends on the application's encryption, key-management, and migration design. Some applications may provide supported migration, re-enrolment, recovery, or re-encryption mechanisms; do not assume that these mechanisms exist or are available. This architecture does not claim that it can migrate, recover, or recreate unavailable cryptographic keys.

---

## 10. Authorization Boundary & Implementation Roadmap

### Strict Authorization Boundaries
* **Authorized in this Turn:**
  * Technical audit and revision of this blueprint document.
* **Prohibited without Explicit User Authorization:**
  * Installing new software or packages.
  * Creating diagnostic applications.
  * Deploying `shizuku-up` or `databak` shell scripts.
  * Executing Shizuku startup commands or modifying ADB persistence.
  * Modifying real application data.
  * Creating real application backups or executing restoration.
  * Deleting, moving, renaming, or overwriting existing files or snapshots.
  * Running new filesystem write tests, destructive tests, or manual staging roundtrips.
  * Creating Git commits or pushing changes.

### Future Implementation Roadmap (Pending Explicit Authorization)
1. **Phase 1: Tool Deployment:** Deploy audited `shizuku-up` and `databak` scripts to `~/bin/`.
2. **Phase 2: Synthetic Validation:** Run end-to-end capture, verification, overlay restore, exact rollback, and corruption handling on disposable synthetic packages.
3. **Phase 3: Manual Staging Roundtrip Validation:** Execute the 4-stage ZArchiver-to-Termux staging test on synthetic data.
4. **Phase 4: Live Target Authorization:** User selects target package for initial baseline snapshot.
