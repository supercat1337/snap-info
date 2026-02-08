// @ts-check
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';

/**
 * Opens the database in readonly mode for safety.
 * @param {string} dbPath
 * @param {object} [options]
 * @param {boolean} [options.readonly] - Whether to open the database in readonly mode (default: true).
 * @returns {import('better-sqlite3').Database}
 */
export function openDb(dbPath, { readonly = true } = {}) {
    return new Database(dbPath, { readonly });
}

/**
 * Calculates a deterministic hash of the entire snapshot.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {string} The final SHA256 hex hash.
 */
export function calculateSnapshotContentHash(db) {
    const snapshotHasher = createHash('sha256');

    const entriesStmt = db.prepare('SELECT * FROM entries ORDER BY path ASC');
    for (const row of entriesStmt.iterate()) {
        snapshotHasher.update(JSON.stringify(row));
    }

    const usersStmt = db.prepare('SELECT * FROM users ORDER BY uid ASC');
    for (const row of usersStmt.iterate()) {
        snapshotHasher.update(JSON.stringify(row));
    }

    const groupsStmt = db.prepare('SELECT * FROM groups ORDER BY gid ASC');
    for (const row of groupsStmt.iterate()) {
        snapshotHasher.update(JSON.stringify(row));
    }
    return snapshotHasher.digest('hex');
}
