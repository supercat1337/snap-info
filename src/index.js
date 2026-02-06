#!/usr/bin/env node
//@ts-check
import { parseArgs } from 'node:util';
import { openDb } from './database.js';
import { getSummary, showVerificationReport, showSummaryFromObject, Summary } from './info.js';
import {
    verifyContent,
    verifyFile,
    verifyFormat,
    VerificationFormatResult,
    VerificationContentResult,
    VerificationFileResult,
} from './verify.js';
import { basename } from 'node:path';

async function main() {
    // Parse command line arguments
    /** @type {import('node:util').ParseArgsConfig['options']} */
    const argOptions = {
        'verify-content': { type: 'string', short: 's' },
        'verify-file': { type: 'string', short: 'k' },
        verify: { type: 'boolean', short: 'v' },
        json: { type: 'boolean', short: 'j' },
        help: { type: 'boolean', short: 'h' },
    };

    const { values, positionals } = parseArgs({ options: argOptions, allowPositionals: true });
    const dbPath = positionals[0];
    const isJson = typeof values.json === 'boolean' ? values.json : false;
    if (values.help || !dbPath) {
        console.log(`
snap-info v1.0.0
Usage: snap-info <database.db> [options]

Options:
  -s, --verify-content [hash]  Verify data integrity (optionally against [hash])
  -k, --verify-file [hash]     Verify file integrity (optionally against [hash])
  -v, --verify                 Verify everything using internal/sidecar data
  -h, --help                   Show this help info
            `);
        return;
    }

    const checkContent = values['verify-content'] !== undefined || values.verify;
    const checkFile = values['verify-file'] !== undefined || values.verify;

    const providedContentHash =
        typeof values['verify-content'] === 'string' ? values['verify-content'] : null;
    const providedFileHash =
        typeof values['verify-file'] === 'string' ? values['verify-file'] : null;

    /** @type {{name: string, 'verify-format': VerificationFormatResult|null, summary: Summary|null, 'verify-content': VerificationContentResult|null, 'verify-file': VerificationFileResult|null}} */
    const report = {
        name: basename(dbPath),
        'verify-format': null,
        summary: null,
        'verify-content': null,
        'verify-file': null,
    };

    // 1. Validate Format First (No point in continuing if this fails)
    report['verify-format'] = verifyFormat(dbPath);

    if (report['verify-format'].status === 'failed') {
        if (isJson) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            console.error(`\n❌ [FORMAT ERROR] ${report['verify-format'].error}`);
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
        if (checkContent) {
            report['verify-content'] = verifyContent(db, dbPath, providedContentHash);
        }

        // 3. Physical verification
        if (checkFile) {
            report['verify-file'] = await verifyFile(dbPath, providedFileHash);
        }

        if (isJson) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            // @ts-ignore
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
