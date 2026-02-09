# snap-info 🔍

A verification and reporting companion for **snap-generator**. It allows you to audit snapshot metadata, perform deep integrity checks, and export forensic reports in machine-readable formats.

**snap-info** ensures that your file system snapshots remain untampered and provides a high-level summary of the captured data without modifying the database.

---

## 🚀 Key Features

- **Format Validation:** Automatically verifies the SQLite 3 magic header and internal schema (tables/columns) before processing.
- **Read-Only Auditing:** Opens databases in immutable mode to ensure that even the act of viewing doesn't change the file's binary hash.
- **Logical Verification:** Recalculates the SHA-256 signature of all database entries to detect internal tampering or row deletion.
- **Physical Verification:** Validates the SQLite database file against standard `.sha256` sidecar files or trusted hashes provided via CLI.
- **Trusted Source Comparison:** Supports comparing internal data against an external "known-good" hash passed through command-line arguments.
- **Structured Reporting:** Supports both human-readable console output and structured JSON for automated security pipelines.

---

## 🛠 Command Line Options

| Flag                  | Long Name | Argument | Description                                                |
| --------------------- | --------- | -------- | ---------------------------------------------------------- |
| -v                    | --verify  | None     | Enable all internal verifications (Content & File).        |
| -s                    | --sig     | <hash>   | Verify logical data against this external SHA-256 string.  |
| -c                    | --chksum  | <hash>   | Verify physical file against this external SHA-256 string. |
| --require-sig-file    | None      | None     | Fail verification if the .sig sidecar file is missing.     |
| --require-chksum-file | None      | None     | Fail verification if the .sha256 sidecar file is missing.  |
| -j                    | --json    | None     | Output the entire report in structured JSON format.        |
| -h                    | --help    | None     | Show help information.                                     |

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/supercat1337/snap-info.git
cd snap-info

# Install dependencies
npm install

# Link for global CLI usage (optional)
npm link
```

## 🛠 Usage

### View Snapshot Summary

Display metadata, platform info, and file statistics:

```bash
snap-info snapshot.db
```

### Full Integrity Audit

Verify both the internal data rows and the physical file container:

```bash
snap-info snapshot.db --verify
```

### Trusted External Verification

If you received a hash via a secure channel, you can force the tool to verify the snapshot against that specific value, ignoring or complementing internal metadata:

```bash
# Verify the data content against a known trusted hash
snap-info snapshot.db --sig 8e1e1657b47dd99ca30d33e0fd419dbba7b38b4485639960d54d86a0644cb224
```

### Strict Forensic Audit

In high-security environments, you may want to ensure that no integrity sidecars were deleted to hide evidence. Use the "require" flags to mandate their presence:

```bash
# Fail if either the .sig or .sha256 files are missing from the directory
snap-info snapshot.db -v --require-sig-file --require-chksum-file
```

### Automated Integrity Monitoring

Since snap-info returns Exit Code 1 on any verification failure, it is perfect for CI/CD pipelines or Cron jobs:

```bash
# If verification fails, the second command (alert) will run
snap-info snapshot.db -v || echo "ALERT: Integrity breach detected!"
```

### Automated JSON Report

Generate a machine-readable report for external auditing tools:

```bash
snap-info snapshot.db --verify --json > report.json
```

---

## 🔐 Verification Layers Explained

1. **Format Integrity:** Checks for a valid SQLite header and the presence of snapshot_info and entries tables.
2. **Logical Content (-s):** Compares the current data state against the snapshot_hash inside the DB and/or the CLI argument or .sig sidecar.
3. **Physical Integrity (-k):** Compares the file's binary hash against the .sha256 sidecar and/or the CLI argument.

---

## 📂 JSON Output Format

When using the `--json` flag, snap-info returns a structured report. This format is ideal for integration with Security Information and Event Management (SIEM) systems.

```json
{
    "name": "snapshot-1770318683747.db",
    "verify-format": {
        "status": "success",
        "data": { "header": "ok", "schema": "ok" },
        "error": null
    },
    "summary": {
        "snapshot_name": "snap",
        "version": "1.0.0",
        "root_path": "C:/Data",
        "scan_start": 1770628897863,
        "scan_end": 1770628901508,
        "time_zone": "Europe/Moscow",
        "os_platform": "win32",
        "total_entries": 5214,
        "total_files": 4025,
        "total_dirs": 1188,
        "total_links": 1,
        "total_size": 173297960,
        "total_errors": 0,
        "snapshot_hash": "8e1e1657...",
        "user_count": 1,
        "group_count": 1,
        "exclude_paths": "[\"**/node_modules\",\"**/.git\"]"
    },
    "verifySign": {
        "status": "success",
        "data": {
            "stored": "8e1e1657...",
            "calculated": "8e1e1657...",
            "external": null,
            "sidecar": "8e1e1657...",
            "matchesInternal": true,
            "matchesExternal": null,
            "matchesSidecar": true
        },
        "error": null
    },
    "verify-file": {
        "status": "failed",
        "data": {
            "actual": "fcb1164f...",
            "sidecar": "fcb1164f...",
            "external": "different_hash_here",
            "matchesSidecar": true,
            "matchesExternal": false
        },
        "error": "Hash mismatch detected"
    }
}
```

---

## 🛡 Security Notes

- **Exit Codes:** The utility exits with code 1 if any requested verification (format, content, or file) fails.
- **Fail-Fast:** If the Format Integrity check fails, the utility immediately aborts to prevent processing corrupted data.

---

## 📄 License

MIT © supercat1337
