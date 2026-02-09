#!/usr/bin/env node
//@ts-check
import { parseArgs } from 'node:util';
import { openDb } from './database.js';
import { getSummary, showSummaryFromObject, Summary } from './summary.js';
import { showVerificationReport, Report } from './report.js';
import { verifyContent, verifyFile, verifyFormat } from './verify.js';

async function main() {
    // Parse command line arguments
    /** @type {import('node:util').ParseArgsConfig['options']} */
    let argOptions = {
        verify: { type: 'boolean', short: 'v', default: false },

        // External Hash Arguments (Values)
        sig: { type: 'string', short: 's' }, // -s <hash> for logical data
        chksum: { type: 'string', short: 'c' }, // -c <hash> for physical file

        // Strictness Flags (File requirements)
        'require-sig-file': { type: 'boolean', default: false },
        'require-chksum-file': { type: 'boolean', default: false },

        json: { type: 'boolean', short: 'j', default: false },
        help: { type: 'boolean', short: 'h', default: false },
    };

    let { values, positionals } = parseArgs({ options: argOptions, allowPositionals: true });

    const dbPath = positionals[0];
    const isJson = typeof values.json === 'boolean' ? values.json : false;

    if (values.help || !dbPath) {
        console.log(`
snap-info v1.0.0
Forensic Snapshot Verification & Reporting Tool

Usage: snap-info <database.db> [options]

Core Options:
  -h, --help                Show this help info
  -j, --json                Output the entire report in structured JSON format
  -v, --verify              Enable all internal verifications (Content & File)

Data Integrity (Logical):
  -s, --sig <hash>          Verify data integrity against this external SHA-256 string
  --require-sig-file        Fail verification if the .sig sidecar file is missing

File Integrity (Physical):
  -c, --chksum <hash>       Verify DB file against this external SHA-256 string
  --require-chksum-file     Fail verification if the .sha256 sidecar file is missing

Examples:
  snap-info snapshot.db                       Show metadata summary only
  snap-info snapshot.db -v                    Verify using internal/sidecar data
  snap-info snapshot.db -s <HASH> --json      Verify data against <HASH> and output JSON
  snap-info snapshot.db -v --require-sig-file Strict audit: fail if .sig is missing

Note: This tool opens databases in READONLY mode to preserve binary integrity.
            `.trim());
        return;
    }

    const options = {
        // We check content if -v is used OR if a specific hash/strictness is requested
        checkContent: values.verify || values.sig !== undefined || values['require-sig-file'],
        checkFile: values.verify || values.chksum !== undefined || values['require-chksum-file'],

        // External values provided directly in CLI
        /** @type {string | null} */
        externalSigValue: typeof values.sig === 'string' ? values.sig : null,
        externalChksumValue: typeof values.chksum === 'string' ? values.chksum : null,

        // Strict requirements for sidecar files
        requireSigFile: !!values['require-sig-file'],
        requireChksumFile: !!values['require-chksum-file'],
    };

    const report = new Report(dbPath);

    // 1. Validate Format First (No point in continuing if this fails)
    report.verifyFormat = verifyFormat(dbPath);

    if (report.verifyFormat.status === 'failed') {
        if (isJson) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            console.error(`\n❌ [FORMAT ERROR] ${report.verifyFormat.error}`);
        }
        process.exit(1);
    }

    // 2. Open DB only after format is confirmed
    const db = openDb(dbPath);

    try {
        // 1. Get Summary
        report.summary = getSummary(db);
        if (!report.summary) throw new Error('Failed to get summary');

        if (!isJson) showSummaryFromObject(report.summary);

        // 2. Logical verification
        if (options.checkContent) {
            report.verifySign = verifyContent(db, dbPath, {
                externalHash: options.externalSigValue,
                requireSigFile: options.requireSigFile,
            });
        }

        // 3. Physical verification
        if (options.checkFile) {
            report.verifyFile = await verifyFile(dbPath, {
                externalHash: options.externalChksumValue,
                requireChksumFile: options.requireChksumFile,
            });
        }

        if (isJson) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            showVerificationReport(report);
        }
    } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error(`\n[FATAL ERROR] ${err.message}`);
    } finally {
        db.close();
    }
}

main();
