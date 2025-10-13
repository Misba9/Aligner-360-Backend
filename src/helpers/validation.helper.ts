/**
 * Validation helper utilities
 */

/**
 * Validates if a string is a valid MongoDB ObjectID
 * MongoDB ObjectID is a 24-character hexadecimal string
 * @param id - The ID string to validate
 * @returns boolean - True if valid ObjectID, false otherwise
 */
export function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // MongoDB ObjectID is exactly 24 characters and contains only hexadecimal characters
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Validates multiple ObjectIDs
 * @param ids - Array of ID strings to validate
 * @returns boolean - True if all IDs are valid, false otherwise
 */
export function areValidObjectIds(ids: string[]): boolean {
  return ids.every((id) => isValidObjectId(id));
}
