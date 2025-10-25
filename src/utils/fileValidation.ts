// Enhanced file validation with MIME type checking

const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'scr', 'vbs', 'js', 'jar',
  'sh', 'app', 'deb', 'rpm', 'dmg', 'pkg', 'msi',
];

const MAGIC_NUMBERS: { [key: string]: number[] } = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'video/mp4': [0x00, 0x00, 0x00, null, 0x66, 0x74, 0x79, 0x70], // null = any byte
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileExtension(filename: string): FileValidationResult {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (!ext) {
    return { valid: false, error: 'No file extension found' };
  }

  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'File type not allowed for security reasons' };
  }

  return { valid: true };
}

export function validateMimeType(mimeType: string): FileValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: 'File type not supported' };
  }

  return { valid: true };
}

export async function validateFileHeader(
  file: File,
  declaredMimeType: string
): Promise<FileValidationResult> {
  try {
    // Only validate files with known magic numbers
    if (!MAGIC_NUMBERS[declaredMimeType]) {
      return { valid: true }; // Skip validation for unknown types
    }

    const arrayBuffer = await file.slice(0, 8).arrayBuffer();
    const header = new Uint8Array(arrayBuffer);
    const expectedHeader = MAGIC_NUMBERS[declaredMimeType];

    for (let i = 0; i < expectedHeader.length; i++) {
      // null means any byte is allowed
      if (expectedHeader[i] === null) continue;

      if (header[i] !== expectedHeader[i]) {
        return {
          valid: false,
          error: 'File content does not match declared type (possible fake extension)',
        };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('File header validation error:', error);
    // On error, allow the file but log it
    return { valid: true };
  }
}

export async function validateFile(file: File): Promise<FileValidationResult> {
  // Check extension
  const extCheck = validateFileExtension(file.name);
  if (!extCheck.valid) {
    return extCheck;
  }

  // Check MIME type
  const mimeCheck = validateMimeType(file.type);
  if (!mimeCheck.valid) {
    return mimeCheck;
  }

  // Check file header (magic numbers)
  const headerCheck = await validateFileHeader(file, file.type);
  if (!headerCheck.valid) {
    return headerCheck;
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
