/**
 * Validates session and job IDs.
 * Supports both MongoDB ObjectIds (24-char hex) and SQLite UUIDs.
 */
export function isValidObjectId(id: string): boolean {
  if (!id) return false;
  // MongoDB check
  if (/^[0-9a-fA-F]{24}$/.test(id)) return true;
  // UUID or custom alphanumeric check (allows test IDs like 'test-uuid-123')
  if (/^[a-zA-Z0-9-]+$/.test(id)) return true;
  return false;
}
