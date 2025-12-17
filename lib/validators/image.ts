export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an image file based on type and size
 * @param file The file to validate
 * @returns ValidationResult
 */
export function validateImage(file: File): ValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file type
  // Note: 'image/jpg' is sometimes used, though 'image/jpeg' is standard. 
  // We include jpg just in case, though browser usually reports jpeg.
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: JPEG, PNG, WebP`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  return { valid: true };
}
