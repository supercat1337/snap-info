// @ts-check
import { basename } from 'node:path';
import {
    VerificationFormatResult,
    VerificationContentResult,
    VerificationFileResult,
} from './verify.js';
import { Summary } from './summary.js';

export class Report {
    /**
     * Initializes a new Report object.
     * @param {string} dbPath - The path to the database file to generate a report for.
     */
    constructor(dbPath) {
        this.name = basename(dbPath);

        /** @type {VerificationFormatResult|null} */
        this.verifyFormat = null;
        /** @type {Summary|null} */
        this.summary = null;
        /** @type {VerificationContentResult|null} */
        this.verifySign = null;
        /** @type {VerificationFileResult|null} */
        this.verifyFile = null;
    }
}

/**
 * Displays the results of the integrity checks.
 * @param {Report} report - The full report object containing verification results
 */
export function showVerificationReport(report) {
    const content = report.verifySign;
    const file = report.verifyFile;

    if (content) {
        if (content.status === 'success') {
            console.log(`✅ Logical Content Integrity: PASSED`);
            if (content.data.matchesSidecar) {
                console.log(`    └─ Source: .sig file`);
            }
            if (content.data.matchesInternal) {
                console.log(`    └─ Source: Internal DB`);
            }
            if (content.data.matchesExternal) {
                console.log(`    └─ Source: CLI Argument`);
            }
        } else {
            console.log(`❌ Logical Content Integrity: FAILED`);

            if (content.error) {
                console.log(`   └─ [!] ${content.error}`);
            }

            if (content.data.matchesSidecar === false) {
                console.log(
                    `   └─ [CONTENT SIDE-CAR MISMATCH] Expected from .sig: ${content.data.sidecar}`
                );
            }
            if (content.data.matchesInternal === false)
                console.log(`   └─ [INTERNAL MISMATCH] Expected: ${content.data.stored}`);

            if (!content.data.matchesExternal === false)
                console.log(`   └─ [CLI HASH MISMATCH] Expected: ${content.data.external}`);

            console.log(`   └─ Actual Calculated: ${content.data.calculated}`);
        }
    }

    if (file) {
        if (file.status === 'success') {
            console.log(`✅ Physical File Integrity: PASSED`);
            if (file.data.matchesSidecar) {
                console.log(`   └─ Source: .sha256 file`);
            }
            if (file.data.matchesExternal) {
                console.log(`   └─ Source: CLI Argument`);
            }
        } else {
            console.log(`❌ Physical File Integrity: FAILED`);
            if (file.error) {
                console.log(`   └─ [!] ${file.error}`);
            }
            if (file.data.matchesSidecar === false) {
                console.log(`   └─ [SIDECAR MISMATCH] Expected: ${file.data.sidecar}`);
            }
            if (file.data.matchesExternal === false) {
                console.log(`   └─ [CLI HASH MISMATCH] Expected: ${file.data.external}`);
            }
        }
    }
}
