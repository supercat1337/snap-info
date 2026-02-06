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

| Flag | Long Name        | Description                                                                                              |
| ---- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| -s   | --verify-content | Recalculate logical hash and compare with internal metadata. Optionally provide a [hash] for comparison. |
| -k   | --verify-file    | Verify DB file against external .sha256 file. Optionally provide a [hash] for comparison.                |
| -v   | --verify         | Perform both logical and physical verification using internal/sidecar data.                              |
| -j   | --json           | Output the entire report in structured JSON format.                                                      |
| -h   | --help           | Show help information.                                                                                   |

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

### Logical Verification against a Trusted Hash

```bash
snap-info snapshot.db -s 8e1e1657b47dd99ca30d33e0fd419dbba7b38b4485639960d54d86a0644cb224
```

### Full Integrity Audit

Verify both the internal data rows and the physical file container:

```bash
snap-info snapshot.db --verify
```

### Automated JSON Report

Generate a machine-readable report for external auditing tools:

```bash
snap-info snapshot.db --verify --json > report.json
```

---

## 🔐 Verification Layers Explained

1. **Format Integrity:** Checks for a valid SQLite header and the presence of snapshot_info and entries tables.
2. **Logical Content (-s):** Compares the current data state against the snapshot_hash inside the DB and/or the CLI argument.
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
    "version": "1.0.0",
    "root_path": "C:\\Data",
    "scan_start": 1770318683771,
    "total_entries": 5202,
    "total_size": 217822308,
    "snapshot_hash": "8e1e1657..."
  },
  "verify-content": {
    "status": "success",
    "data": {
      "stored": "8e1e1657...",
      "calculated": "8e1e1657...",
      "external": null,
      "matchesInternal": true,
      "matchesExternal": true
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
