#!/usr/bin/env node
//@ts-check
import { parseArgs } from 'node:util';
import { openDb } from './database.js';
import { getSummary, showVerificationReport, showSummaryFromObject } from './info.js';
import { verifyContent, verifyFile } from './verify.js';
import { basename } from 'node:path';

async function main() {
    // Parse command line arguments
    /** @type {import('node:util').ParseArgsConfig['options']} */
    const argOptions = {
        'verify-content': { type: 'boolean', short: 's' },
        'verify-file': { type: 'boolean', short: 'k' },
        verify: { type: 'boolean', short: 'v' },
        json: { type: 'boolean', short: 'j' },
        help: { type: 'boolean', short: 'h' },
    };

    const { values, positionals } = parseArgs({ options: argOptions, allowPositionals: true });
    const dbPath = positionals[0];
    const isJson = values.json;
    if (values.help || !dbPath) {
        console.log(`
snap-info v1.0.0
Usage: snap-info <database.db> [options]

Options:
  -s, --verify-content  Recalculate logical hash and compare with internal metadata
  -k, --verify-file     Verify DB file against external .sha256 file
  -v, --verify          Perform both content and file verification
  -h, --help            Show this help info
            `);
        return;
    }

    const report = {
        name: basename(dbPath),
        summary: null,
        'verify-content': null,
        'verify-file': null,
    };

    const db = openDb(dbPath);
    try {
        // 1. Show basic summary first
        report.summary = getSummary(db);
        if (!isJson) showSummaryFromObject(report.summary);

        // 2. Logical data integrity verification
        if (values['verify-content'] || values.verify) {
            report['verify-content'] = verifyContent(db, isJson);
        }

        // 3. Physical file checksum verification
        if (values['verify-file'] || values.verify) {
            report['verify-file'] = await verifyFile(dbPath, isJson);
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
