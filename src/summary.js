//@ts-check

/**
 * Formats and displays the snapshot metadata for the console.
 * @param {Summary} summary - The summary object returned by getSummary()
 */
export function showSummaryFromObject(summary) {
    if (!summary) return;

    // Use default values if properties are missing to prevent NaN/Invalid Date
    const start = summary.scan_start || 0;
    const end = summary.scan_end || 0;

    const duration = ((end - start) / 1000).toFixed(2);
    const startDate = start ? new Date(start).toLocaleString() : 'N/A';
    const totalMB = ((summary.total_size || 0) / 1024 / 1024).toFixed(2);

    console.log(`\n--- Snapshot Summary ---`);
    console.log(`- Snapshot Name: ${summary.snapshot_name}`);
    console.log(`- Target Path:   ${summary.root_path}`);
    console.log(`- Excludes:      ${summary.exclude_paths}`);
    console.log(`- Created On:    ${startDate} (${summary.time_zone || 'UTC'})`);
    console.log(`- Platform:      ${summary.os_platform}`);
    console.log(`- Duration:      ${duration}s`);
    console.log(`-------------------------------------------`);
    console.log(`- Total Entries: ${summary.total_entries.toLocaleString()}`);
    console.log(`  └─ Files:      ${summary.total_files.toLocaleString()}`);
    console.log(`  └─ Dirs:       ${summary.total_dirs.toLocaleString()}`);
    console.log(`  └─ Links:      ${summary.total_links.toLocaleString()}`);
    console.log(`- Data Size:     ${totalMB} MB`);
    console.log(`- Errors:        ${summary.total_errors}`);
    console.log(`- Signature:     ${summary.snapshot_hash || 'N/A'}`);
    console.log(`-------------------------------------------`);
    console.log(`- Auth Metadata:`);
    console.log(`  └─ Users:      ${summary.user_count}`);
    console.log(`  └─ Groups:     ${summary.group_count}`);
    console.log(`-------------------------------------------`);
}

export class Summary {
    /**
     * @param {*} data
     */
    constructor(data) {
        this.snapshot_name = data.snapshot_name;
        this.version = data.version;
        this.root_path = data.root_path;
        this.scan_start = data.scan_start;
        this.scan_end = data.scan_end;
        this.time_zone = data.time_zone;
        this.os_platform = data.os_platform;
        this.total_entries = data.total_entries;
        this.total_files = data.total_files;
        this.total_dirs = data.total_dirs;
        this.total_links = data.total_links;
        this.total_size = data.total_size;
        this.total_errors = data.total_errors;
        this.snapshot_hash = data.snapshot_hash;
        this.user_count = data.user_count;
        this.group_count = data.group_count;
        this.exclude_paths = data.exclude_paths;
    }
}

/**
 * Retrieves summary information from the snapshot database.
 * @param {import('better-sqlite3').Database} db
 * @returns {Summary|null} Summary info or null if not found/error
 */
export function getSummary(db) {
    try {
        /** @type {any} */
        const info =
                db.prepare('SELECT * FROM snapshot_info').get();
        if (!info) return null;

        // @ts-ignore
        const user_count = /* @type {number} */ db
            .prepare('SELECT COUNT(*) as count FROM users')
            .get().count;
        // @ts-ignore
        const group_count = /* @type {number} */ db
            .prepare('SELECT COUNT(*) as count FROM groups')
            .get().count;

        return new Summary({
            snapshot_name: info.snapshot_name,
            version: info.version,
            root_path: info.root_path,
            scan_start: Number(info.scan_start), // Ensure it's a number
            scan_end: Number(info.scan_end),
            time_zone: info.time_zone,
            os_platform: info.os_platform,
            total_entries: info.total_entries,
            total_files: info.total_files,
            total_dirs: info.total_dirs,
            total_links: info.total_links,
            total_size: info.total_size,
            total_errors: info.total_errors,
            snapshot_hash: info.snapshot_hash,
            user_count: user_count,
            group_count: group_count,
            exclude_paths: info.exclude_paths
        });
    } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error('Error retrieving snapshot info:', error.message);
        return null;
    }
}


