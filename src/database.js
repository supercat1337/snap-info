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
 * Uses .iterate() to handle large datasets without high RAM usage.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {string} The final SHA256 hex hash.
 */
export function calculateSnapshotContentHash(db) {
    const snapshotHasher = createHash('sha256');

    // WITHOUT ROWID tables store data sorted by PRIMARY KEY, so we can iterate directly.
    // This ensures we get a consistent order regardless of the underlying storage or platform.
    const statement = db.prepare('SELECT * FROM entries ORDER BY path ASC');

    for (const row of statement.iterate()) {
        // Stringify each row to ensure consistent hashing. We can also choose to only hash certain fields if desired.
        // This will give us a consistent hash regardless of the underlying storage or platform.
        snapshotHasher.update(JSON.stringify(row));
    }

    return snapshotHasher.digest('hex');
}

