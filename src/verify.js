//@ts-check
import { readFileSync, existsSync } from 'node:fs';
import { calculateSnapshotHash } from './database.js';
import { calculateFileHash } from './hash.js';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {boolean} [quiet=false]
 */
export function verifyContent(db, quiet = false) {
    if (!quiet) process.stdout.write(`[*] Verifying logical data integrity... `);

    const info = /** @type {{ snapshot_hash: string }} */ (
        db.prepare('SELECT snapshot_hash FROM snapshot_info').get()
    );
    if (!info?.snapshot_hash) {
        if (!quiet) console.log('FAILED\n[!] Error: No snapshot_hash found.');
        return { status: 'failed', data: { stored: null, calculated: null } };
    }

    const currentHash = calculateSnapshotHash(db);
    const isValid = currentHash === info.snapshot_hash;

    if (!quiet) console.log(isValid ? 'PASSED' : 'FAILED');

    return {
        status: isValid ? 'success' : 'failed',
        data: { stored: info.snapshot_hash, calculated: currentHash },
    };
}

/**
 * @param {string} dbPath
 * @param {boolean} [quiet=false]
 */
export async function verifyFile(dbPath, quiet = false) {
    const checksumPath = `${dbPath}.sha256`;
    if (!quiet) process.stdout.write(`[*] Verifying physical file checksum... `);

    if (!existsSync(checksumPath)) {
        if (!quiet) console.log('SKIPPED');
        return { status: 'failed', data: { error: 'Checksum file missing' } };
    }

    try {
        const expectedLine = readFileSync(checksumPath, 'utf8').split('\n')[0];
        const expectedHash = expectedLine.split(' ')[0];
        const actualHash = await calculateFileHash(dbPath);
        const isValid = expectedHash === actualHash;

        if (!quiet) console.log(isValid ? 'PASSED' : 'FAILED');

        return {
            status: isValid ? 'success' : 'failed',
            data: { expected: expectedHash, actual: actualHash },
        };
    } catch (e) {
        if (!quiet) console.log('ERROR');
        let err = e instanceof Error ? e : new Error(String(e));
        return { status: 'failed', data: { error: err.message } };
    }
}
