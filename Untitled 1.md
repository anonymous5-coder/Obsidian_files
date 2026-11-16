# FINAL TARGETED CORRECTION PASS — EXISTING `databak` BLUEPRINT ONLY

The Revision 3 targeted correction pass is substantially accepted. The actual revised document has been reviewed.

Perform one final, narrowly scoped correction pass on the existing `Android_Data_Access_Without_Root.md` file only. Do not redesign the architecture, repeat already completed corrections, or make unrelated editorial changes.

## 1. Shizuku status independence

Correct Section 2 so that startup-command outcome and actual Shizuku service status are independent fields.

### Startup-command outcome

Keep startup-command outcome independently classified as:

- `SUCCESS`: The startup command was executed and returned a successful exit status.
- `FAILED`: The startup command was executed but failed, was terminated, or returned a non-zero exit status.
- `NOT_RUN`: The startup command was not executed during the relevant operation.

### Shizuku service status

- `SUCCESS`: Define solely by independently verified Binder liveness through a documented compatible client. Startup does not have to have been executed during the current operation. An already-running, Binder-responsive service can therefore be `SUCCESS` while startup outcome is `NOT_RUN`.
- `FAILED`: Retain the affirmative-evidence requirement. Evidence must establish actual service unavailability, termination, or failure. A failed startup attempt, lack of a process check, or a process observation that does not independently establish actual service unavailability must not, by itself, establish service failure. A process-not-found observation must be evaluated in the context of the reliability, scope, and timestamp of that observation. Binder liveness, when independently verified through a documented compatible client, establishes `SUCCESS` for that observation time.
- `SERVICE_STATUS_UNVERIFIED`: Use whenever available evidence is insufficient to establish either service success or failure. This includes cases where neither startup nor process status has been checked; cases where startup evidence exists but Binder liveness has not been independently verified and no independent affirmative evidence establishes service failure; and cases where process evidence exists but its reliability, scope, or timestamp is insufficient to establish actual service unavailability. Do not classify a service as `SERVICE_STATUS_UNVERIFIED` merely because Binder liveness was not checked if other reliable, affirmative evidence independently establishes service failure. In that case, classify the service as `FAILED` for the supported observation time.

Do not conflate Binder liveness, client authorization, and successful target filesystem operations.

Status must reflect the evidence for the relevant observation time. Record observation timestamps and evidence sources. If evidence conflicts or refers to different observation times, do not combine it into an unsupported status; report the latest adequately supported state and retain the earlier evidence.

A `SUCCESS` service status applies only to the recorded Binder-liveness observation time. It must not imply uninterrupted or continuing service availability after that observation.

If a process observation appears to conflict with independently verified Binder liveness, do not classify the service as `FAILED` solely from the process observation. Record both observations with their timestamps and evidence sources; independently verified Binder liveness establishes `SUCCESS` at its observation time.

A `FAILED` service status, like `SUCCESS`, applies to the supported observation time and evidence scope. It does not establish that the service cannot subsequently become available. A later independently verified Binder-liveness observation may establish `SUCCESS` for that later observation time.

## 2. Manifest metadata example

Correct the manifest example so that it does not assert UID/GID or SELinux restoration limitations as fixed facts.

Replace the example's categorical values with explicit `NOT_VERIFIED` example states, such as:

- `UID_GID_RESTORATION_NOT_VERIFIED`
- `SELINUX_CONTEXT_RESTORATION_NOT_VERIFIED`
- `XATTR_RESTORATION_NOT_VERIFIED`

Preserve the existing manifest structure where practical. Do not invent device-specific metadata findings or imply that an unverified capability is necessarily unavailable.

Retain the distinction between:

1. Observed metadata.
2. Archived metadata.
3. Demonstrably restorable metadata.

Assign `NOT_VERIFIED` when the attribute's restoration capability has not been adequately verified or available evidence is insufficient. Assign `NOT_APPLICABLE` only when there is a supported basis for establishing that the attribute genuinely does not apply. Never use one state as a substitute for the other.

### Metadata field-name and schema consistency

The existing example uses the field `metadata_limitations`. Putting `NOT_VERIFIED` statuses inside that field could imply that unverified capabilities are confirmed limitations.

Resolve this carefully:

- Preserve the existing manifest structure and field name unless the existing blueprint establishes that changing the field name is compatible with its documented references and requirements.
- Determine compatibility only from the existing blueprint's documented schema references and requirements. Do not assume compatibility with undocumented external consumers.
- If compatibility cannot be established from the documented material, retain `metadata_limitations` and explicitly document that its `NOT_VERIFIED` entries represent unresolved metadata-verification states, not confirmed restoration limitations or established restoration failures.
- If a compatible, narrowly scoped field-name correction is established, prefer `metadata_status` and use it consistently throughout the manifest example and associated documentation.
- Do not maintain conflicting field names in different examples or descriptions.
- Do not redesign the manifest schema.

## 3. Storage accounting

Separate storage accounting into two clearly defined calculations.

### A. Retained repository footprint

Include:

- Retained published snapshots and their archives.
- Snapshot manifests and metadata.
- Checksums and verification records.
- Restoration journals.
- Other retained repository metadata.

Apply the initial cumulative 2.0 GB warning threshold to this defined repository footprint across all packages.

Preserve its status as a warning threshold, not a hard limit or automatic deletion trigger.

Evaluate the projected retained repository footprint before publication as:

`Existing retained repository footprint + New snapshot's projected retained footprint`

Do not include temporary copies in this threshold unless they are retained as repository content.

If the projected retained repository footprint exceeds the 2.0 GB warning threshold, `databak` must warn the user and require explicit user approval before proceeding. Approval may permit the operation to proceed. The threshold must not operate as an absolute storage cap or automatic deletion trigger.

Re-evaluate the projected retained repository footprint using the actual retained snapshot size and the current retained repository contents immediately before publication. If the updated projection exceeds the 2.0 GB warning threshold and explicit approval has not already been obtained for that projected amount, warn the user and obtain explicit approval before proceeding with publication. Do not silently bypass the approval safeguard because an earlier estimate was below the threshold.

### B. Peak working-space requirement

Separately account for actual temporary staging, intermediate files, verification/extraction workspace, and any additional simultaneous copies required by the implemented pipeline.

Evaluate available free space on every participating filesystem against the actual peak working-space requirement before starting the operation.

Calculate peak additional space requirements separately for each participating filesystem, accounting for the actual placement and lifetime of temporary and intermediate files. Do not treat free space on one filesystem as available capacity on another.

Do not count the same physical data twice. In particular, a same-filesystem rename from staging to the final snapshot location does not create a second physical copy merely because publication has occurred.

Insufficient actual working space must still abort before the operation starts. Do not weaken existing safeguards or introduce arbitrary fixed multipliers.

Where the exact peak working-space requirement depends on data that is not yet available, derive the pre-operation requirement from the known source inventory, the documented processing pipeline, and the actual temporary-file placement and lifetime rules. Do not represent an estimate as an exact measurement.

If sufficient working space cannot be established from the available information and supported calculations, do not begin the operation. Reassess available capacity before any later stage whose additional working-space requirement could exceed the established preflight allowance. Do not rely on arbitrary multipliers or assume that a later storage-space failure can be safely recovered from.

## 4. Evidence precision

Correct Section 3 without changing the original empirical results, hashes, timestamps, exit codes, or recorded outputs.

### Step 10

- Retain its `PASS` classification and recorded matching remote/local SHA-256 values.
- Explicitly state that the exact command was not preserved in the available evidence.
- Do not present its descriptive operation as a complete recorded command.
- Do not reconstruct, expand, or invent the missing command.
- Change the table heading so that it accurately accommodates both preserved commands and descriptive operation records. For example, use `Preserved Command / Descriptive Operation Record`.
- Do not present Step 10's descriptive operation as a command.
- Retain all other recorded commands verbatim.
- Correct the Evidence Preservation Note immediately above the table so it distinguishes preserved commands from descriptive operation records. State that actual recorded commands are reproduced verbatim, while Step 10 is a descriptive operation record whose exact command was not preserved. Do not imply that every table row contains a preserved command.

### Direct Termux conclusion

Narrow the conclusion to the actual protected-target operations tested:

- Step 2a: Protected target directory enumeration — `FAIL`, permission denied.
- Step 9a: Protected target directory creation — `FAIL`, permission denied.

Preserve Step 1's successful parent-directory metadata read and Steps 5–8's successful local staging operations as separate evidence categories.

Do not generalize these two failures into a claim that all direct Termux operations fail, or that every Android 15 device behaves identically.

Remove or narrowly qualify any additional summary statement that generalizes the two tested failures into a broader conclusion about all direct Termux operations requiring access to protected external package directories.

The conclusion must identify only the tested failures in Steps 2a and 9a, while retaining the separate successful and untested evidence categories.

Preserve the existing distinction between:

1. Direct Termux access.
2. ADB-mediated access.
3. Local Termux staging.
4. ZArchiver/Shizuku access and manual staging, which remain separately classified according to their actual evidence.

Do not alter the original empirical results, hashes, timestamps, exit codes, or recorded outputs to make the revised summary appear more complete than the evidence supports.

### Opening Direct Termux Access Finding

Explicitly correct the opening Direct Termux Access Finding as well.

It must state that the two tested direct Termux operations against protected target directories (Steps 2a and 9a) failed with permission denied.

It must separately acknowledge:

- Step 1's successful parent-directory metadata read.
- Steps 5–8's successful local staging operations.

Do not describe all tested direct Termux operations as denied.

Retain any valid, appropriately qualified Android platform-policy explanation already present in the blueprint. Do not present a general platform-policy statement as though it were an empirical result from Steps 2a and 9a. Keep platform-policy context distinct from the specific tested outcomes, and do not introduce unsupported universal device-specific claims.

## 5. Symbolic-link policy

Restore the explicit symbolic-link preservation restriction.

Only relative symbolic links may be preserved, and only when their resolved targets and every link in their complete resolution chains remain inside the declared root.

- During capture, validate against the declared backup root.
- During restoration, validate against the declared restoration target root.
- Reject absolute symbolic links, escaping links, links with escaping resolution chains, and unsupported link configurations.
- Do not weaken existing extraction protections against archive-path traversal, hard links, pre-existing destination symlinks, duplicate or conflicting entries, or TOCTOU redirection.
- Do not recreate special filesystem objects such as device nodes, sockets, or FIFOs.

If safe confinement cannot be established, fail closed and abort before modifying the target.

Preserve the existing distinction between archive-path validation, symbolic-link validation, hard-link validation, and destination-path confinement.

A symbolic link whose complete resolution chain cannot be reliably established must not be preserved or recreated. This includes cyclic or dangling chains, inaccessible resolution targets, and resolution results that cannot be validated reliably. Treat these as unsupported or unsafe link configurations. Fail closed before modifying the restoration target whenever the required confinement cannot be established.

## 6. Application-state wording

Correct Section 9 without overstating where application state is stored.

Use wording that makes clear:

- Application databases, credentials, shared preferences, and cryptographic material may reside in private application storage.
- Cryptographic keys may be managed or protected through Android Keystore, including hardware-backed implementations.
- The precise arrangement varies by application.
- Android Keystore must not be described as a general storage location for application databases or shared preferences.
- This external-data backup architecture does not capture private application state or guarantee restoration of credentials or cryptographic keys.

Preserve the existing external-data scope boundary.

### Device-bound encryption qualification

Review the existing device-bound encryption statement.

Do not assert that every file encrypted using hardware-backed or device-bound keys is universally unrecoverable across physical devices.

Use conditional wording that makes clear:

- Where external files depend on device-bound keys that are unavailable on another device, copying the files alone does not make them decryptable on that device.
- The actual outcome depends on the application's encryption, key-management, and migration design.
- Some applications may provide supported migration, re-enrolment, recovery, or re-encryption mechanisms; do not assume that these mechanisms exist or are available.
- This architecture must not claim that it can migrate, recover, or recreate unavailable cryptographic keys.

Preserve the distinction between external files and the private application state or cryptographic capabilities required to use them.

Do not introduce unsupported application-specific or device-specific claims.

## 7. Publication completion marker

Correct the recoverable publication-marker protocol while preserving the existing distinction between `SUCCESS`, `PARTIAL`, and `FAILED` capture results.

If the designated completion-marker path already exists in the final destination, do not overwrite, replace, or reuse it. Treat the destination as a collision or invalid existing snapshot location and abort publication to that destination. Resolve the collision only through the existing no-overwrite rules; do not silently adopt an existing marker.

### A. Distinguish publication completion from capture success

The completion marker indicates successful completion of the publication process. It does not, by itself, mean that the capture result state is `SUCCESS`.

Preserve the existing result-state definitions:

- `SUCCESS`: The declared capture scope was completely captured and all required capture-stage integrity, checksum, and completeness criteria passed.
- `PARTIAL`: A usable artifact was produced, but one or more required entries, access operations, source-consistency checks, or declared capture-verification criteria could not be fully satisfied. The limitations must be accurately recorded.
- `FAILED`: No usable verified capture archive was produced, a mandatory capture-integrity requirement failed, or the capture process aborted without producing a usable artifact. A publication-integrity failure alone does not establish a `FAILED` capture result when the capture artifact had already satisfied the mandatory capture-integrity requirements.

Keep capture result state and publication state conceptually separate. Do not use the completion marker to upgrade, reinterpret, or overwrite the capture result state.

Clarification — Capture outcome versus publication outcome
A failure or interruption of the publication process after a usable capture artifact has been successfully produced must not automatically change the previously established capture result state from SUCCESS or PARTIAL to FAILED.
In such a case, preserve the capture result state and classify publication separately as incomplete, interrupted, or failed, as supported by the evidence. Do not create an authoritative completion marker, and do not present the unpublished artifact as a completed published recovery point.
Use FAILED as the capture result when the capture itself meets the existing FAILED definition. A publication failure alone is not sufficient to reclassify an otherwise valid capture result.
Clarification — Capture integrity versus publication integrity

Distinguish integrity validation performed to establish the capture result from integrity validation performed to establish successful publication.

- A failure of a mandatory capture-integrity requirement means the capture result must be "FAILED", in accordance with the existing result-state definition.
- A failure of a mandatory publication-integrity requirement means publication must not be recognized as complete or receive an authoritative completion marker.
- A publication-integrity failure occurring after a usable capture artifact has already received a valid "SUCCESS" or "PARTIAL" capture classification must not, by itself, retroactively change that capture classification.
- Preserve the established capture result and record the publication failure separately, unless the evidence independently establishes that the original capture-integrity requirements also failed.
- Do not treat an archive or record that failed final-destination verification as a successfully published usable snapshot, even if the earlier staging artifact had passed its checks.

Do not weaken either the mandatory capture-integrity requirements or the mandatory publication-integrity requirements. Their outcomes must remain separately identifiable.

### B. Requirements before marker creation

Before creating the completion marker:

1. All required snapshot components must be completely written.
2. All applicable verification stages must have been executed to the extent possible, and their actual outcomes must be recorded.
3. Mandatory publication-integrity requirements must pass, including archive integrity, applicable checksum validation, and consistency between the archive, manifest, checksums, and verification records. The artifact being checked must correspond to the applicable publication path: the complete staging artifact before the verified atomic directory rename, or the transferred final-destination artifact after fallback copying. These are publication-stage checks and must remain distinguishable from the earlier capture-stage integrity checks. Do not treat successful staging verification as a substitute for the required final-destination verification in the fallback copy-based protocol.
4. Scope-completeness results must be recorded accurately. Any inaccessible entries, incomplete enumeration, source changes, unsupported entries, or other limitations must be reflected in the manifest and the snapshot result state.
5. Associated verification records must be completely written and persisted. A verification stage that cannot be completed because of a documented access, enumeration, or source-consistency limitation may contribute to a `PARTIAL` result; it must not be silently treated as passed. Such a limitation does not automatically prevent publication when mandatory artifact-integrity and publication requirements have independently passed.

A verification process that successfully identifies incomplete scope must not be misrepresented as a successful scope-completeness result.

### Consistency with the existing Section 5 verification model

Reconcile Section 5's existing three-stage verification model with these publication rules.

Verification stages must be executed and their actual outcomes recorded to the extent possible. They must not all be described as necessarily passing for every publishable snapshot.

- Mandatory artifact-integrity checks must pass.
- Scope-completeness verification may accurately identify an incomplete scope, resulting in `PARTIAL` rather than a successful completeness result.
- Other verification outcomes must be classified according to whether they represent mandatory artifact-integrity failure or a documented capture limitation.
- An incomplete scope must not be silently treated as a successful completeness result merely to satisfy a publication requirement.

Update Section 5's wording accordingly so that a correctly identified incomplete scope does not contradict the eligibility of a fully published `PARTIAL` snapshot.

### Clarification — Mandatory artifact integrity versus capture completeness

Distinguish mandatory artifact-integrity requirements from scope-completeness and source-consistency requirements.

- Failure of a mandatory artifact-integrity requirement prevents publication as a completed usable snapshot. If the failed requirement belongs to capture-integrity validation, the capture result must be `FAILED`. If it belongs exclusively to publication-integrity validation after a valid capture result has been established, publication must remain incomplete, interrupted, or failed as supported by the evidence, while the previously established capture result is preserved. A publication-integrity failure must not be used as evidence of capture-integrity failure unless independent evidence establishes that the original capture-integrity requirements also failed.
- Scope-completeness and source-consistency requirements determine whether the capture result is `SUCCESS` or `PARTIAL`. An accurately identified incomplete scope or source change may result in `PARTIAL` without invalidating an otherwise structurally sound and integrity-verified archive.
- Do not classify a failed mandatory integrity check as merely `PARTIAL` to permit publication.
- Do not classify a successfully detected scope omission as an integrity failure merely because the capture is incomplete.

A `PARTIAL` snapshot may receive a completion marker only when its mandatory artifact-integrity and publication requirements pass, while its incomplete capture scope and other limitations remain accurately recorded.

### C. `PARTIAL` publication eligibility

A snapshot with result state `PARTIAL` may receive a completion marker if:

- Its publication process has completed.
- Its archive and mandatory publication-integrity requirements pass.
- Its associated manifest and verification records are complete and internally consistent.
- Its limitations and incomplete scope are accurately recorded.

The snapshot must remain `PARTIAL`. Creating a completion marker must never upgrade it to `SUCCESS`.

A snapshot whose capture result is `FAILED` must not be published with an authoritative completion marker. A failed capture must not be made discoverable as a completed usable recovery point merely because some individual files or temporary artifacts were written.

A snapshot with result state `FAILED`, an invalid archive, failed mandatory integrity verification, or incomplete publication must not be presented as a completed usable recovery point.

If a snapshot that was previously published is subsequently found to be corrupted or invalid, preserve the historical publication evidence, but classify the artifact as currently invalid or unusable. A historical completion marker must not override a later integrity failure or establish current restoration eligibility.

### D. Snapshot discovery and classification

Snapshot discovery must validate the completion marker and associated verification records before recognizing a publication as completed.

It must distinguish:

1. A fully published `SUCCESS` snapshot.
2. A fully published but incomplete `PARTIAL` snapshot.
3. An interrupted, invalid, or failed publication.

A marker without valid associated records must not establish completed publication.

An interrupted publication, a publication missing required components or associated records, or an invalid publication must remain distinguishable from a completed publication and must never be presented as a usable completed recovery point.

This restriction concerns publication completeness, not capture-scope completeness: a fully published `PARTIAL` snapshot may be recognized as a published `PARTIAL` recovery point when all mandatory publication-integrity requirements pass and its limitations are accurately recorded. This recognition does not guarantee complete recovery or successful restoration of every archived entry; the existing restoration eligibility and verification requirements remain applicable.

Distinguish recognition of publication completion from confirmation of current archive integrity and restoration eligibility.

Discovery must validate the marker's association with the snapshot and its required publication records. A snapshot must not be represented as integrity-verified or restoration-eligible solely because discovery recognizes its publication as complete.

The applicable archive-integrity, checksum, manifest-consistency, and restoration-eligibility checks remain independently required when the snapshot is inspected or considered for restoration.

### E. Final-destination validation for fallback publication

Preserve the existing same-filesystem atomic-rename path where supported and verified.

Where the fallback protocol copies components into the final snapshot directory:

- Verify the final destination copies and associated records after transfer.
- Create the completion marker in the final snapshot directory only after those checks pass.
- Associate the marker unambiguously with the corresponding snapshot ID, manifest, and verification records.
- Do not rely solely on verification of the temporary staging copies.

Preserve the existing no-overwrite and temporary-artifact safety rules.

### Consistency with the existing Section 6 repository structure

Update the existing Section 6 repository structure diagram and publication description so they accurately represent:

- The completion marker.
- All required persisted publication-verification records.
- Their explicitly documented final-destination locations.
- Their association with the corresponding snapshot ID and manifest.

Use one stable, explicitly named marker filename and document its association with the snapshot ID, manifest, and required verification records.

Do not invent an unnecessary verification-record schema, duplicate existing metadata without justification, or redesign the repository structure.

### Clarification — Atomic-rename publication

For the verified same-filesystem atomic-rename path, prepare the completion marker inside the temporary staging directory only after all required components, verification records, and mandatory publication-integrity checks are complete.

The marker becomes authoritative for snapshot discovery only when the complete staging directory, including the marker, is successfully published at its final location through the verified atomic directory rename.

If the rename fails or is interrupted, the staging artifact must not be recognized as a published snapshot. An existing final snapshot must never be overwritten.

Snapshot discovery must search only the designated final snapshot locations. A marker found inside a temporary staging directory must never make that staging directory discoverable as a published snapshot.

For the fallback copy-based protocol, retain the separate requirement that the marker is created in the final destination directory only after final-destination verification succeeds.

Both paths must produce the same externally observable publication states and must preserve the distinction between publication completion and capture result state.

### F. Subsequent verification

The completion marker is a publication-state indicator, not a substitute for rechecking archive integrity, checksums, manifest consistency, or snapshot eligibility when a snapshot is inspected or restored.

The existing restoration eligibility rules remain authoritative:

- `SUCCESS` snapshots retain their existing restoration eligibility requirements.
- `PARTIAL` snapshots remain eligible only for explicitly acknowledged overlay restoration, with disclosure of their incomplete source state.
- `FAILED` snapshots remain ineligible for restoration under every mode.

A marker must never override a failed subsequent integrity check, invalid archive, inconsistent manifest, or failed restoration-eligibility check.

Do not weaken existing restoration safeguards or change the meaning of the result states.

## Preservation and authorization constraints

Preserve all other valid content, original evidence, hashes, timestamps, commands, scope rules, authorization boundaries, retention rules, restoration safeguards, and roadmap material.

Do not:

- Redesign the architecture.
- Reconstruct missing empirical evidence.
- Invent commands, test results, hashes, timestamps, or device-specific capabilities.
- Execute implementation or startup commands.
- Run tests or filesystem operations.
- Create backups or perform restoration.
- Delete, move, rename, or overwrite device data or snapshots.
- Install software or modify device configuration.
- Modify any file other than the existing `Android_Data_Access_Without_Root.md`.
- Create Git commits or push changes.

Make only the corrections required by this prompt and the minimum directly necessary consistency edits to the existing Sections 5 and 6. Do not use these consistency edits as permission for broader revisions.

If a requested change cannot be reconciled with an existing documented requirement without redesigning the architecture, preserve the existing content, document the precise conflict in the completion report, and do not invent a resolution.

## Required completion report

After editing, report:

1. The exact sections and specific statements changed.
2. Confirmation that all seven correction areas were addressed.
3. Confirmation that the Section 5 verification model was reconciled with `PARTIAL` publication eligibility.
4. Confirmation that the Section 6 repository structure and publication description reflect the completion marker and required persisted verification records.
5. Confirmation that the existing 2.0 GB threshold's explicit-approval safeguard was preserved.
6. Confirmation that unrelated content and existing empirical evidence were preserved.
7. Any unresolved technical limitations, compatibility questions, or ambiguities.
8. Confirmation that no implementation, startup, testing, backup, restore, deletion, installation, device operation, commit, or push was performed.

Stop at the documentation boundary. Do not begin implementation.




