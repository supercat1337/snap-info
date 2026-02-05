//@ts-check

/**
 * Formats and displays the snapshot metadata for the console.
 * @param {{scan_start: number, scan_end: number, total_size: number, total_entries: number, total_files: number, total_dirs: number, total_links: number, total_errors: number, snapshot_hash: string, root_path: string, version: string, time_zone: string, os_platform: string}} summary - The summary object returned by getSummary()
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
    console.log(`- Version:      ${summary.version}`);
    console.log(`- Target Path:  ${summary.root_path}`);
    console.log(`- Created On:   ${startDate} (${summary.time_zone || 'UTC'})`);
    console.log(`- Platform:     ${summary.os_platform}`);
    console.log(`- Duration:     ${duration}s`);
    console.log(`-------------------------------------------`);
    console.log(`- Total Entries: ${summary.total_entries.toLocaleString()}`);
    console.log(`  └─ Files:      ${summary.total_files.toLocaleString()}`);
    console.log(`  └─ Dirs:       ${summary.total_dirs.toLocaleString()}`);
    console.log(`  └─ Links:      ${summary.total_links.toLocaleString()}`);
    console.log(`- Data Size:     ${totalMB} MB`);
    console.log(`- Errors:        ${summary.total_errors}`);
    console.log(`- Content Hash:  ${summary.snapshot_hash || 'N/A'}`);
    console.log(`-------------------------------------------`);
}

/**
 * Retrieves summary information from the snapshot database.
 * @param {import('better-sqlite3').Database} db
 * @returns {Object|null} Summary info or null if not found/error
 */
export function getSummary(db) {
    try {
        const info =
            /** @type {{version: string,root_path:string,scan_start:number,scan_end:number,time_zone:string,os_platform:string,total_entries:number,total_files:number,total_dirs:number,total_links:number,total_size:number,total_errors:number, snapshot_hash:string}} */ (
                db.prepare('SELECT * FROM snapshot_info').get()
            );
        if (!info) return null;

        return {
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
        };
    } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error('Error retrieving snapshot info:', error.message);
        return null;
    }
}

/**
 * Displays the results of the integrity checks.
 * @param {{"verify-content": {status: string, data: {stored: string, calculated: string}}, "verify-file": {status: string, data: {expected: string, actual: string, error: string}}}} report - The full report object containing verification results
 */
export function showVerificationReport(report) {
    const content = report['verify-content'];
    const file = report['verify-file'];

    if (!content && !file) return;

    console.log(`--- Integrity Verification Report ---`);

    if (content) {
        const icon = content.status === 'success' ? '✅' : '❌';
        console.log(`${icon} Logical Content Integrity: ${content.status.toUpperCase()}`);
        if (content.status === 'failed') {
            console.log(`   └─ Stored Hash:     ${content.data.stored}`);
            console.log(`   └─ Calculated Hash: ${content.data.calculated}`);
        }
    }

    if (file) {
        const icon = file.status === 'success' ? '✅' : '❌';
        console.log(`${icon} Physical File Checksum:   ${file.status.toUpperCase()}`);
        if (file.status === 'failed') {
            if (file.data.error) {
                console.log(`   └─ Error: ${file.data.error}`);
            } else {
                console.log(`   └─ Expected Hash: ${file.data.expected}`);
                console.log(`   └─ Actual Hash:   ${file.data.actual}`);
            }
        }
    }
    console.log(`-------------------------------------------`);
}
