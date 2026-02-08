//@ts-check
import { readFileSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { calculateSnapshotContentHash, openDb } from './database.js';
import { calculateFileHash } from './hash.js';

/**
 * Base Verification Class to ensure consistent structure
 */
export class VerificationResult {
    /**
     * @param {'success' | 'failed'} status
     * @param {Object} data
     * @param {string | null} error
     */
    constructor(status, data, error = null) {
        this.status = status;
        this.data = data;
        this.error = error;
    }
}

export class VerificationContentResult extends VerificationResult {
    /**
     * @param {'success' | 'failed'} status
     * @param {{stored: string|null, calculated: string, external: string|null, matchesInternal: boolean|null, matchesExternal: boolean|null, matchesSidecar: boolean|null, sidecar: string|null}} data
     * @param {string|null} error
     */
    constructor(status, data, error = null) {
        super(status, data, error);
    }
}

export class VerificationFileResult extends VerificationResult {
    /**
     * @param {'success' | 'failed'} status
     * @param {{actual: string, sidecar: string|null, external: string|null, matchesSidecar: boolean|null, matchesExternal: boolean|null}} data
     * @param {string|null} error
     */
    constructor(status, data, error = null) {
        super(status, data, error);
    }
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} dbPath
 * @param {string|null} externalHash
 */
export function verifyContent(db, dbPath, externalHash = null) {
    const info = db.prepare('SELECT snapshot_hash FROM snapshot_info').get();
    const currentHash = calculateSnapshotContentHash(db);

    let sidecarContentHash = null;
    let matchesSidecar = null;
    const sidecarPath = `${dbPath}.content.hash`;

    if (existsSync(sidecarPath)) {
        try {
            const lines = readFileSync(sidecarPath, 'utf8').split('\n');
            // find first non-empty, non-comment line
            let found = lines.find(line => line.trim() && !line.startsWith('#'))?.trim();
            if (found) {
                sidecarContentHash = found;
                matchesSidecar = currentHash === sidecarContentHash;
            }
        } catch (e) {
            matchesSidecar = false;
        }
    }

    // @ts-ignore
    const matchesInternal = info?.snapshot_hash ? currentHash === info.snapshot_hash : null;
    const matchesExternal = externalHash ? currentHash === externalHash : null;

    // Strict logic: mismatch is a failure; missing internal hash is also a failure for content
    const isMismatch =
        matchesInternal === false || matchesExternal === false || matchesSidecar === false;
    const hasSource =
        // @ts-ignore
        info?.snapshot_hash != null || externalHash != null || sidecarContentHash != null;

    /** @type {'success' | 'failed'} */
    let status = 'success';
    let error = null;

    if (isMismatch) {
        status = 'failed';
        error = 'Logical hash mismatch detected';
    } else if (!hasSource) {
        status = 'failed';
        error = 'No logical verification source available';
    }

    return new VerificationContentResult(
        status,
        {
            // @ts-ignore
            stored: info?.snapshot_hash || null,
            calculated: currentHash,
            external: externalHash,
            sidecar: sidecarContentHash,
            matchesInternal,
            matchesExternal,
            matchesSidecar,
        },
        error
    );
}

/**
 * @param {string} dbPath
 * @param {string|null} externalHash
 */
export async function verifyFile(dbPath, externalHash = null) {
    const actualHash = await calculateFileHash(dbPath);
    let sidecarHash = null;
    let matchesSidecar = null;

    const checksumPath = `${dbPath}.sha256`;
    if (existsSync(checksumPath)) {
        try {
            const line = readFileSync(checksumPath, 'utf8').split('\n')[0];
            sidecarHash = line.split(/\s+/)[0];
            matchesSidecar = actualHash === sidecarHash;
        } catch (e) {
            matchesSidecar = false;
        }
    }
    const matchesExternal = externalHash ? actualHash === externalHash : null;

    const hasSource = sidecarHash !== null || externalHash !== null;
    const isMismatch = matchesSidecar === false || matchesExternal === false;

    /** @type {'success' | 'failed'} */
    let status = 'success';
    let error = null;

    if (isMismatch) {
        status = 'failed';
        error = 'Physical hash mismatch detected';
    } else if (!hasSource) {
        status = 'failed';
        error = 'No verification source available (missing .sha256 and no CLI hash)';
    }

    return new VerificationFileResult(
        status,
        {
            actual: actualHash,
            sidecar: sidecarHash,
            external: externalHash,
            matchesSidecar,
            matchesExternal,
        },
        error
    );
}

export class VerificationFormatResult extends VerificationResult {
    /**
     * Constructs a new VerificationFormatResult object.
     * @param {'success' | 'failed'} status - The verification status.
     * @param {Object} data - The verification data object.
     * @param {string | null} [error] - An optional error message if the verification failed.
     */
    constructor(status, data, error = null) {
        super(status, data, error);
    }
}

/**
 * Runs a low-level SQLite integrity check.
 * @param {import('better-sqlite3').Database} db
 * @returns {boolean}
 */
export function runSqliteQuickCheck(db) {
    const result = db.prepare('PRAGMA quick_check').get();
    // @ts-ignore
    return result.quick_check === 'ok';
}

/**
 * Verifies that the database has the required tables and columns.
 * @param {import('better-sqlite3').Database} db
 * @returns {{isValid: boolean, error: string|null}}
 */
export function verifyDatabaseSchema(db) {
    const requiredTables = ['snapshot_info', 'entries', 'users', 'groups'];
    const schemaMap = {
        snapshot_info: ['version', 'snapshot_hash', 'root_path'],
        entries: ['path', 'hash', 'type', 'size'],
        users: ['uid', 'username', 'gid', 'gecos', 'homedir', 'shell'],
        groups: ['gid', 'groupname', 'members'],
    };

    try {
        for (const table of requiredTables) {
            // Check if table exists
            const tableExists = db
                .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
                .get(table);
            if (!tableExists) return { isValid: false, error: `Missing table: ${table}` };

            // Check for critical columns
            const columns = db
                .prepare(`PRAGMA table_info(${table})`)
                .all()
                // @ts-ignore
                .map(c => c.name);

            // @ts-ignore
            for (const col of schemaMap[table]) {
                if (!columns.includes(col))
                    return { isValid: false, error: `Missing column '${col}' in table '${table}'` };
            }
        }
        return { isValid: true, error: null };
    } catch (e) {
        let err = e instanceof Error ? e : new Error(String(e));
        return { isValid: false, error: `Schema probe failed: ${err.message}` };
    }
}

/**
 * Verifies if the file header matches the SQLite 3 standard.
 * @param {string} filePath
 * @returns {boolean}
 */
export function verifySqliteHeader(filePath) {
    const MAGIC_HEADER = 'SQLite format 3\0';
    const buffer = Buffer.alloc(16);

    try {
        const fd = openSync(filePath, 'r');
        readSync(fd, buffer, 0, 16, 0);
        closeSync(fd);
        return buffer.toString('binary') === MAGIC_HEADER;
    } catch (e) {
        return false;
    }
}

/**
 * Validates file header, SQLite integrity, and table schema.
 * @param {string} dbPath
 */
export function verifyFormat(dbPath) {
    const isHeaderValid = verifySqliteHeader(dbPath); // From previous step
    if (!isHeaderValid) return new VerificationFormatResult('failed', {}, 'Invalid SQLite header');

    const db = openDb(dbPath);

    const isInternalOk = runSqliteQuickCheck(db);
    if (!isInternalOk) {
        db.close();
        return new VerificationFormatResult('failed', {}, 'SQLite internal corruption detected');
    }

    const schema = verifyDatabaseSchema(db);
    if (!schema.isValid) {
        db.close();
        return new VerificationFormatResult('failed', {}, schema.error);
    }

    db.close();
    return new VerificationFormatResult('success', { header: 'ok', integrity: 'ok', schema: 'ok' });
}
