#!/usr/bin/env node
//@ts-check
import { parseArgs } from 'node:util';
import { openDb } from './database.js';
import { getSummary, showVerificationReport, showSummaryFromObject } from './info.js';
import { verifyContent, verifyFile, verifyFormat } from './verify.js';
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

    let report = {
        name: basename(dbPath),
        "verify-format": verifyFormat(dbPath),
        summary: null,
        'verify-content': null,
        'verify-file': null,
    };

    const db = openDb(dbPath);
    try {
        // 1. Show basic summary first
        // @ts-ignore
        report.summary = getSummary(db);
        // @ts-ignore
        if (!isJson) showSummaryFromObject(report.summary);

        // 2. Logical data integrity verification
        if (checkContent) {
            // @ts-ignore
            report['verify-content'] = verifyContent(db, providedContentHash);
        }

        // 3. Physical file checksum verification
        if (checkFile) {
            // @ts-ignore
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
