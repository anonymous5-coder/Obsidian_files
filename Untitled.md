# Automated App-Data Safety Backup and Recovery System

Build an automated, reliable, non-destructive backup and recovery routine for application data that I am authorized to access and modify.

## 1. Pre-modification snapshots

1. Before every modification, create a uniquely named, timestamped snapshot of the complete relevant target data.
2. Never overwrite, silently replace, or automatically delete an existing snapshot.
3. Use a unique snapshot identifier and collision-resistant naming.
4. Do not permit modifications to proceed when a required safety snapshot fails or remains incomplete.
5. Provide an explicit mechanism for exceptional cases, but never silently bypass backup failure.

## 2. Data preservation

6. Preserve directory structure, filenames, file contents, permissions, timestamps and other available metadata wherever technically possible.
7. Record metadata that cannot be preserved, including ownership, UID/GID, SELinux context, extended attributes and filesystem-specific attributes.
8. Do not falsely claim that original ownership, permissions or security contexts can be restored when Android does not permit it.
9. Preserve symbolic links and other filesystem objects safely where supported.
10. Handle SQLite databases correctly, including associated WAL and SHM files. Prefer SQLite's supported online backup mechanism or an application-coordinated consistent backup. Do not assume copying an active database file alone produces a consistent snapshot.

## 3. Integrity verification

11. Verify backup integrity using:

- File counts.
- Total file sizes.
- Per-file cryptographic checksums (prefer SHA-256).
- Directory and manifest consistency.

12. Detect missing files, truncated files, unreadable files and incomplete transfers.
13. Use a staging directory during backup creation. Mark a snapshot VALID only after all copying and verification steps succeed.
14. Never classify an incomplete or partially verified snapshot as a successful backup.
15. Record verification results in a machine-readable manifest.

## 4. Backup storage and security

16. Store snapshots outside the target application's private directory, preferably in accessible shared storage.
17. Check available storage capacity before starting a backup.
18. Avoid storing backups in the same location as the original data if that creates a common data-loss risk.
19. Protect sensitive backup contents, including databases, authentication tokens, credentials and personal information.
20. Provide encrypted backup storage where feasible, with a secure key-management approach. Never hardcode encryption passwords or expose them in logs.
21. Do not upload backups to external services or cloud storage without explicit authorization.

## 5. Restoration capabilities

22. Support selective file restoration and full-directory restoration.
23. Verify the selected snapshot's integrity before restoration.
24. Check application package identity, version, target paths and relevant compatibility conditions before restoring.
25. Detect whether the target application must be stopped to prevent concurrent writes or inconsistent data.
26. Never automatically uninstall, reinstall, clear application data, modify package signatures or change application identity.
27. Never automatically overwrite current data during restoration.
28. Require explicit confirmation before any restoration that replaces existing files.
29. Preserve the current target state through a separate pre-restoration snapshot before replacing data.
30. Restore only metadata and security attributes that the current access mechanism can legitimately restore.
31. Verify restored file integrity and report any metadata or restoration limitations.

## 6. Android security and access limitations

32. Respect Android's application UID sandbox, SELinux policies, scoped storage and filesystem restrictions.
33. Do not assume that Shizuku or ADB shell can read arbitrary `/data/user/0/<package_name>/` directories.
34. Detect and identify the actual access mechanism available for each target:

- Shizuku.
- ADB shell.
- Authorized `run-as` access.
- Application-provided export or backup.
- Other legitimate, explicitly authorized mechanisms.

35. Distinguish between complete access, partial access and inaccessible data.
36. Never claim that a backup is complete when some target files could not be accessed.
37. Do not attempt to bypass Android security restrictions through unverified privilege escalation.

## 7. Logging and operational controls

38. Provide a dry-run mode that displays intended operations without modifying data.
39. Maintain a clear operation log containing:

- Timestamp.
- Target package name.
- Application version, where available.
- Original source paths.
- Snapshot identifier and destination.
- Files copied and skipped.
- Integrity verification results.
- Errors and permission limitations.
- Restoration operations and their outcomes.

40. Clearly distinguish SUCCESS, PARTIAL, FAILED and NOT SUPPORTED states.
41. Provide backup listing, inspection, selective restoration and full restoration commands or interfaces.
42. Do not delete old snapshots automatically. Any cleanup must require explicit user authorization.

## 8. Implementation and testing

43. Design the routine to work within my existing mobile Termux environment wherever technically feasible.
44. Avoid unnecessary root requirements, external dependencies and destructive operations.
45. Separate backup, verification, restoration and cleanup operations.
46. Test the implementation using a disposable test directory before using actual application data.
47. Include failure tests for insufficient storage, interrupted copying, inaccessible files, checksum mismatches and interrupted restoration.
48. Document the precise capabilities and limitations of every supported access mechanism.

## 9. Additional consistency, identity and recovery requirements

49. Define the exact backup scope for each target application, including included directories, excluded paths, inaccessible files and unsupported filesystem objects. A backup must never be described as a complete application backup when only a subset of its private data was acquired.
    
50. Treat a modification session or transaction as the backup boundary. Create one verified pre-modification recovery point before a controlled modification session, and create additional snapshots when separately requested or when a new recovery boundary is necessary.
    
51. Detect concurrent application writes. Use an application-coordinated backup, a supported database snapshot mechanism, or an appropriately controlled application-stop procedure when required. Do not claim consistency merely because file copying completed.
    
52. Record application identity information where available: package name, Android user/profile, version name, version code, signing-certificate fingerprint and relevant application schema information.
    
53. Record dependencies on Android Keystore, hardware-backed keys, device-bound encryption and other non-exportable security material. Clearly distinguish copied data from data that can actually be decrypted and restored.
    
54. Maintain separate file-level and content-level verification. Where possible, perform database integrity checks and relevant application-specific validation in addition to checksums.
    
55. Implement restoration as a recoverable transaction. Use a restoration journal, staged files, pre-restoration snapshots and post-restoration verification. Detect interrupted restoration and provide a recovery procedure.
    
56. Do not assume that restoring files restores application functionality. Report limitations involving ownership, permissions, SELinux labels, database state, encryption keys, application version and other dependencies.
    
57. Distinguish between backup-manager-controlled modifications and modifications performed independently through other applications. Do not claim to enforce backup protection over operations outside the controlled workflow.
    
58. Keep temporary staging separate from permanent backup storage. Prefer Termux-private storage for staging and verified encrypted archives in accessible storage for retained backups. Do not rely on shared storage to preserve Unix filesystem metadata.
    
59. If the initial baseline exceeds the configured storage budget, stop and request an explicit user decision. Never omit files, weaken verification or delete existing snapshots to force the backup into the budget.
    
60. Treat the five recent recovery points as additional to the protected baseline. Retention must never automatically authorize deletion; snapshot cleanup always requires explicit user authorization.
    
61. For content-addressed snapshots, store file metadata separately from content objects. Maintain verifiable object references, snapshot manifests and dependency tracking so every retained snapshot can be reconstructed independently.
    
62. Before enabling incremental backup or deduplication, test reconstruction and restoration after intermediate snapshots have been removed from a disposable test dataset.
    
63. Use same-filesystem atomic publication where supported. Do not assume that moving staged data between different filesystems or storage providers is atomic.
    
64. Verify that the encryption key can be recovered independently of the backup itself. Warn that losing the encryption key can make retained backups permanently inaccessible.
    
65. Provide a capability matrix for each target application showing read access, write access, consistent backup, metadata preservation, selective restoration and full restoration as separate capabilities.

## Storage-Efficient Snapshot and Retention Policy

Implement an intelligent backup manager that minimizes storage consumption without compromising recoverability.

1. Create one complete baseline snapshot before the first modification.
2. Use incremental or deduplicated snapshots for subsequent modifications.
3. Store unchanged file contents only once where technically feasible.
4. Ensure every retained snapshot can be restored independently, even if intermediate snapshots are removed.
5. Maintain accurate snapshot manifests and reference tracking.
6. Never delete a shared data object while another retained snapshot depends on it.
7. Configure a default backup storage budget of 2 GB, adjustable by the user.
8. Provide configurable retention for recent snapshots, with an initial target of five recent recovery points.
9. Preserve the original baseline until the user explicitly authorizes its deletion.
10. Before removing any snapshot, verify that its removal will not break the recovery of other snapshots.
11. Warn before exceeding the storage budget. Never silently delete valid recovery points to make space.
12. Provide storage reports showing:
    - Total backup storage consumed.
    - Actual unique storage consumed.
    - Storage attributed to each snapshot.
    - Number of retained snapshots.
    - Available storage.
13. Support manual snapshot pinning so important recovery points are protected from automatic cleanup.
14. Use atomic snapshot creation and integrity verification.
15. Test full restoration from incremental/deduplicated snapshots before enabling automatic retention cleanup.

If incremental backup complexity or filesystem limitations make reliable recovery impossible, fall back to full snapshots with explicit storage warnings rather than implementing unsafe deduplication.

## Critical implementation rule

A backup is not considered successful merely because files were copied.

It must be:

- Complete relative to the declared accessible scope.
- Integrity-verified.
- Properly recorded in its manifest.
- Clearly distinguished from partial or inaccessible data.

A restore operation must never proceed silently or destroy the current state without explicit confirmation.

First inspect the actual device environment and available permissions. Present the proposed architecture, supported capabilities and limitations before implementing anything. Do not modify application data during the initial inspection or design phase.