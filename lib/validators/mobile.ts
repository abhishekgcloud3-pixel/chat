/**
 * Validate mobile number format
 * Supports 10-15 digits, international format with optional + prefix
 * @param mobileNumber - The mobile number to validate
 * @returns true if valid, false otherwise
 */
export function validateMobileNumber(mobileNumber: string): boolean {
  // Remove spaces, hyphens, and other common separators
  const cleaned = mobileNumber.replace(/[\s\-()]/g, '')
  
  // Check if it starts with + (international format) or is a digit
  const mobileRegex = /^\+?[1-9]\d{9,14}$/
  
  return mobileRegex.test(cleaned)
}

/**
 * Normalize mobile number (remove non-digit characters except leading +)
 * @param mobileNumber - The mobile number to normalize
 * @returns Normalized mobile number
 */
export function normalizeMobileNumber(mobileNumber: string): string {
  // Remove spaces, hyphens, and other separators but keep the +
  let normalized = mobileNumber.trim()
  
  if (normalized.startsWith('+')) {
    normalized = '+' + normalized.substring(1).replace(/[\s\-()]/g, '')
  } else {
    normalized = normalized.replace(/[\s\-()]/g, '')
  }
  
  return normalized
}
