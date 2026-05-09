/**
 * Validates session and job IDs.
 * Supports both MongoDB ObjectIds (24-char hex) and SQLite UUIDs.
 */
export function isValidObjectId(id: string): boolean {
  if (!id) return false;
  // MongoDB check (24-char hex)
  if (/^[0-9a-fA-F]{24}$/.test(id)) return true;
  // UUID check (standard 8-4-4-4-12 format)
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) return true;
  // Explicit test ID check (must start with 'test-')
  if (id.startsWith("test-")) return true;
  return false;
}
