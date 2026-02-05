# snap-info 🔍

A verification and reporting companion for **snap-generator**. It allows you to audit snapshot metadata, perform deep integrity checks, and export forensic reports in machine-readable formats.

snap-info ensures that your file system snapshots remain untampered and provides a high-level summary of the captured data without modifying the database.

---

## 🚀 Key Features

- **Read-Only Auditing:** Opens databases in immutable mode to ensure that even the act of viewing doesn't change the file's binary hash.
- **Logical Verification:** Recalculates the SHA-256 signature of all database entries to detect internal tampering or row deletion.
- **Physical Verification:** Validates the SQLite database file against standard `.sha256` sidecar files.
- **Structured Reporting:** Supports both human-readable console output and structured JSON for automated security pipelines.

---

## 🛠 Command Line Options

| Flag | Long Name         | Description                                         |
|------|-------------------|-----------------------------------------------------|
| -s   | --verify-content  | Recalculate logical hash and compare with internal metadata |
| -k   | --verify-file     | Verify DB file against external .sha256 file        |
| -v   | --verify          | Perform both logical and physical verification      |
| -j   | --json            | Output the entire report in structured JSON format  |
| -h   | --help            | Show help information                               |

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

### Automated JSON Report
Generate a machine-readable report for external auditing tools:

```bash
snap-info snapshot.db --verify --json > report.json
```

---

## 🔐 Verification Layers Explained

### 1. Logical Content Integrity (`-s`)
The tool iterates through every file record in the `entries` table, sorts them by path, and recalculates the master hash. It then compares this against the `snapshot_hash` stored in the `snapshot_info` table.

**Detects:** Manual SQL edits, deleted rows, or database corruption.

### 2. Physical File Integrity (`-k`)
The tool calculates the binary hash of the `.db` file and compares it to the value stored in the `.sha256` sidecar file.

**Detects:** Bit rot, file transfer errors, or low-level file tampering.

---

## 📂 JSON Output Format

When using the `--json` flag, the tool returns a standardized object:

```json
{
  "name": "snapshot-1707123456.db",
  "summary": {
    "version": "1.0.0",
    "root_path": "/var/www",
    "created_at": 1707123456,
    "stats": {
      "total_entries": 1250,
      "files": 1100,
      "dirs": 140,
      "links": 10,
      "size_bytes": 45000000
    }
  },
  "verify-content": {
    "status": "success",
    "data": { "stored": "hash...", "calculated": "hash..." }
  },
  "verify-file": {
    "status": "failed",
    "data": { "error": "Checksum file missing" }
  }
}
```

---

## 🛡 Security Notes

- **Exit Codes:** snap-info will exit with code 1 if any requested verification fails, making it ideal for use in CI/CD or Cron jobs.
- **Forensic Mode:** Always use the `--verify` flag when moving snapshots between systems to ensure the Chain of Custody remains intact.

---

## 📄 License

MIT © supercat1337
