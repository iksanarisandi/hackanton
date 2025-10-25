import { Context } from 'hono';
import { Env } from '../types';

// Storage quota limits
export const STORAGE_LIMITS = {
  MAX_TOTAL_SIZE: 100 * 1024 * 1024, // 100MB per user
  MAX_FILE_COUNT: 50, // 50 files per user
  MAX_FILES_PER_IDEA: 10, // 10 files per idea
};

interface StorageInfo {
  totalSize: number;
  fileCount: number;
  maxSize: number;
  maxFiles: number;
  percentUsed: number;
  canUpload: boolean;
}

export async function getStorageInfo(
  c: Context<{ Bindings: Env }>,
  userId: number
): Promise<StorageInfo> {
  try {
    // Get or create storage tracking
    let storage = await c.env.DB.prepare(
      'SELECT total_size, file_count FROM user_storage WHERE user_id = ?'
    ).bind(userId).first<{ total_size: number; file_count: number }>();

    if (!storage) {
      // Calculate from actual attachments
      const actual = await c.env.DB.prepare(`
        SELECT COALESCE(SUM(a.size), 0) as total_size, COUNT(*) as file_count
        FROM attachments a
        JOIN ideas i ON a.idea_id = i.id
        WHERE i.user_id = ? AND a.type = 'file'
      `).bind(userId).first<{ total_size: number; file_count: number }>();

      storage = actual || { total_size: 0, file_count: 0 };

      // Create storage tracking record
      await c.env.DB.prepare(
        'INSERT INTO user_storage (user_id, total_size, file_count) VALUES (?, ?, ?)'
      ).bind(userId, storage.total_size, storage.file_count).run();
    }

    const percentUsed = (storage.total_size / STORAGE_LIMITS.MAX_TOTAL_SIZE) * 100;

    return {
      totalSize: storage.total_size,
      fileCount: storage.file_count,
      maxSize: STORAGE_LIMITS.MAX_TOTAL_SIZE,
      maxFiles: STORAGE_LIMITS.MAX_FILE_COUNT,
      percentUsed: Math.round(percentUsed * 100) / 100,
      canUpload: storage.total_size < STORAGE_LIMITS.MAX_TOTAL_SIZE && 
                 storage.file_count < STORAGE_LIMITS.MAX_FILE_COUNT,
    };
  } catch (error) {
    console.error('Get storage info error:', error);
    // On error, return safe defaults
    return {
      totalSize: 0,
      fileCount: 0,
      maxSize: STORAGE_LIMITS.MAX_TOTAL_SIZE,
      maxFiles: STORAGE_LIMITS.MAX_FILE_COUNT,
      percentUsed: 0,
      canUpload: true,
    };
  }
}

export async function checkStorageQuota(
  c: Context<{ Bindings: Env }>,
  userId: number,
  fileSize: number
): Promise<{ allowed: boolean; reason?: string }> {
  const storageInfo = await getStorageInfo(c, userId);

  if (storageInfo.fileCount >= STORAGE_LIMITS.MAX_FILE_COUNT) {
    return {
      allowed: false,
      reason: `Maximum file limit reached (${STORAGE_LIMITS.MAX_FILE_COUNT} files)`,
    };
  }

  if (storageInfo.totalSize + fileSize > STORAGE_LIMITS.MAX_TOTAL_SIZE) {
    const available = STORAGE_LIMITS.MAX_TOTAL_SIZE - storageInfo.totalSize;
    const availableMB = (available / (1024 * 1024)).toFixed(2);
    return {
      allowed: false,
      reason: `Storage quota exceeded. Available: ${availableMB}MB`,
    };
  }

  return { allowed: true };
}

export async function checkIdeaFileLimit(
  c: Context<{ Bindings: Env }>,
  ideaId: number
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const count = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM attachments WHERE idea_id = ? AND type = "file"'
    ).bind(ideaId).first<{ count: number }>();

    if (count && count.count >= STORAGE_LIMITS.MAX_FILES_PER_IDEA) {
      return {
        allowed: false,
        reason: `Maximum ${STORAGE_LIMITS.MAX_FILES_PER_IDEA} files per idea`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Check idea file limit error:', error);
    return { allowed: true }; // On error, allow
  }
}

export async function updateStorageUsage(
  c: Context<{ Bindings: Env }>,
  userId: number,
  sizeDelta: number,
  countDelta: number
): Promise<void> {
  try {
    // Ensure user_storage record exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM user_storage WHERE user_id = ?'
    ).bind(userId).first();

    if (!existing) {
      await c.env.DB.prepare(
        'INSERT INTO user_storage (user_id, total_size, file_count) VALUES (?, ?, ?)'
      ).bind(userId, Math.max(0, sizeDelta), Math.max(0, countDelta)).run();
    } else {
      await c.env.DB.prepare(
        'UPDATE user_storage SET total_size = MAX(0, total_size + ?), file_count = MAX(0, file_count + ?), last_updated = datetime("now") WHERE user_id = ?'
      ).bind(sizeDelta, countDelta, userId).run();
    }
  } catch (error) {
    console.error('Update storage usage error:', error);
  }
}
