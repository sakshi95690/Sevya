import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  isCloudinaryConfigured,
  uploadToCloudinary,
  deleteFromCloudinary,
  getCloudinaryStatus,
} from './cloudinaryService.ts';

function deriveSupabaseUrlFromDbUrl(dbUrl?: string): string {
  if (!dbUrl) return '';
  const match = dbUrl.match(/@([^:/]+)/);
  if (match && match[1] && match[1].includes('supabase.co')) {
    const host = match[1];
    const projectRef = host.replace(/^db\./, '').replace(/\.supabase\.co$/, '');
    return `https://${projectRef}.supabase.co`;
  }
  return '';
}

const supabaseUrl =
  process.env.SUPABASE_URL ||
  deriveSupabaseUrlFromDbUrl(process.env.DATABASE_URL) ||
  '';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'sevya-proofs';

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey);
}

// Export Cloudinary status helpers
export { isCloudinaryConfigured, getCloudinaryStatus };

// Backwards compatibility aliases
export const isS3Configured = () => isCloudinaryConfigured() || isSupabaseStorageConfigured();
export const isStorageConfigured = () => isCloudinaryConfigured() || isSupabaseStorageConfigured();

let supabaseClientInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    if (!isSupabaseStorageConfigured()) {
      throw new Error(
        'Supabase Storage is not configured. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.'
      );
    }
    supabaseClientInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClientInstance;
}

let bucketChecked = false;
async function ensureBucketExists(client: SupabaseClient, bucket: string): Promise<void> {
  if (bucketChecked) return;
  try {
    const { data: buckets } = await client.storage.listBuckets();
    if (buckets && !buckets.some((b) => b.name === bucket)) {
      await client.storage.createBucket(bucket, { public: false });
    }
    bucketChecked = true;
  } catch (_err) {
    // Ignore if bucket creation fails or bucket already exists
  }
}

// In-memory buffer store for dev/testing fallback when Cloudinary & Supabase are not set
const localBufferStore = new Map<string, { buffer: Buffer; mimeType: string }>();

// Sanitize filename to prevent directory traversal or invalid characters
export function sanitizeFileName(fileName: string): string {
  const nameOnly = fileName.replace(/^.*[\\/]/, '');
  return nameOnly.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

// Generate canonical storage object path: temples/{templeId}/tasks/{taskId}/proofs/{proofId}/{filename}
export function buildProofObjectKey(
  templeId: string,
  taskId: string,
  proofId: string,
  originalFileName: string
): string {
  const safeName = sanitizeFileName(originalFileName);
  return `temples/${templeId}/tasks/${taskId}/proofs/${proofId}/${safeName}`;
}

export function buildProjectFileObjectKey(
  templeId: string,
  projectId: string,
  fileId: string,
  originalFileName: string
): string {
  const safeName = sanitizeFileName(originalFileName);
  return `temples/${templeId}/projects/${projectId}/files/${fileId}/${safeName}`;
}

export interface UploadProofParams {
  templeId: string;
  taskId: string;
  proofId: string;
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
}

export interface UploadProjectFileParams {
  templeId: string;
  projectId: string;
  fileId: string;
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
}

export interface UploadProofResult {
  objectKey: string;
  bucket: string;
  fileSize: number;
  url?: string;
  engine: 'cloudinary' | 'supabase' | 'local';
}

export const SUPPORTED_MIME_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  VIDEOS: ['video/mp4', 'video/webm', 'video/quicktime'],
  DOCUMENTS: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  DOCUMENT: 20 * 1024 * 1024, // 20MB
  VIDEO: 100 * 1024 * 1024, // 100MB
};

export function validateFileFormatAndSize(
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  const isImage = SUPPORTED_MIME_TYPES.IMAGES.includes(mimeType);
  const isVideo = SUPPORTED_MIME_TYPES.VIDEOS.includes(mimeType);
  const isDoc = SUPPORTED_MIME_TYPES.DOCUMENTS.includes(mimeType);

  if (!isImage && !isVideo && !isDoc) {
    return {
      valid: false,
      error: `Unsupported file format (${mimeType}). Allowed formats: JPG, PNG, WEBP, GIF, MP4, WEBM, MOV, PDF, TXT, DOC, DOCX.`,
    };
  }

  let limit = FILE_SIZE_LIMITS.IMAGE;
  if (isDoc) limit = FILE_SIZE_LIMITS.DOCUMENT;
  if (isVideo) limit = FILE_SIZE_LIMITS.VIDEO;

  if (fileSize > limit) {
    const limitMb = Math.round(limit / (1024 * 1024));
    return {
      valid: false,
      error: `File size exceeds the ${limitMb} MB limit for this file type.`,
    };
  }

  return { valid: true };
}

// Upload proof file to Cloudinary (Primary), Supabase (Secondary), or Local Buffer (Fallback)
export async function uploadProofFile(params: UploadProofParams): Promise<UploadProofResult> {
  const defaultObjectKey = buildProofObjectKey(
    params.templeId,
    params.taskId,
    params.proofId,
    params.originalFileName
  );

  // 1. Primary Engine: Cloudinary
  if (isCloudinaryConfigured()) {
    try {
      const cldResult = await uploadToCloudinary({
        fileBuffer: params.fileBuffer,
        folder: `sevya/temples/${params.templeId}/tasks/${params.taskId}`,
        originalFileName: params.originalFileName,
        mimeType: params.mimeType,
        publicId: `proof_${params.proofId}`,
      });

      return {
        objectKey: cldResult.secureUrl, // store secure URL as objectKey/url for instant direct rendering
        bucket: 'cloudinary',
        fileSize: cldResult.fileSize,
        url: cldResult.secureUrl,
        engine: 'cloudinary',
      };
    } catch (cldErr: any) {
      console.warn('Cloudinary upload failed, falling back to secondary storage:', cldErr?.message);
    }
  }

  // 2. Secondary Engine: Supabase Storage
  if (isSupabaseStorageConfigured()) {
    const supabase = getSupabaseClient();
    await ensureBucketExists(supabase, bucketName);

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(defaultObjectKey, params.fileBuffer, {
        contentType: params.mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase Storage Upload Error: ${error.message}`);
    }

    return {
      objectKey: defaultObjectKey,
      bucket: bucketName,
      fileSize: params.fileBuffer.length,
      engine: 'supabase',
    };
  }

  // 3. Fallback: High-performance local buffer store
  localBufferStore.set(defaultObjectKey, {
    buffer: params.fileBuffer,
    mimeType: params.mimeType,
  });

  return {
    objectKey: defaultObjectKey,
    bucket: 'local',
    fileSize: params.fileBuffer.length,
    engine: 'local',
  };
}

// Upload project document / attachment to Cloudinary, Supabase, or Local Buffer
export async function uploadProjectFile(params: UploadProjectFileParams): Promise<UploadProofResult> {
  const defaultObjectKey = buildProjectFileObjectKey(
    params.templeId,
    params.projectId,
    params.fileId,
    params.originalFileName
  );

  // 1. Primary Engine: Cloudinary
  if (isCloudinaryConfigured()) {
    try {
      const cldResult = await uploadToCloudinary({
        fileBuffer: params.fileBuffer,
        folder: `sevya/temples/${params.templeId}/projects/${params.projectId}`,
        originalFileName: params.originalFileName,
        mimeType: params.mimeType,
        publicId: `file_${params.fileId}`,
      });

      return {
        objectKey: cldResult.secureUrl,
        bucket: 'cloudinary',
        fileSize: cldResult.fileSize,
        url: cldResult.secureUrl,
        engine: 'cloudinary',
      };
    } catch (cldErr: any) {
      console.warn('Cloudinary project file upload failed, falling back:', cldErr?.message);
    }
  }

  // 2. Secondary Engine: Supabase Storage
  if (isSupabaseStorageConfigured()) {
    const supabase = getSupabaseClient();
    await ensureBucketExists(supabase, bucketName);

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(defaultObjectKey, params.fileBuffer, {
        contentType: params.mimeType,
        upsert: true,
      });

    if (error) {
      console.warn('Supabase Storage Upload Error for project file:', error.message);
    } else {
      return {
        objectKey: defaultObjectKey,
        bucket: bucketName,
        fileSize: params.fileBuffer.length,
        engine: 'supabase',
      };
    }
  }

  // 3. Fallback: High-performance local buffer store
  localBufferStore.set(defaultObjectKey, {
    buffer: params.fileBuffer,
    mimeType: params.mimeType,
  });

  return {
    objectKey: defaultObjectKey,
    bucket: 'local',
    fileSize: params.fileBuffer.length,
    url: `/api/v1/storage/local-download?key=${encodeURIComponent(defaultObjectKey)}`,
    engine: 'local',
  };
}

// Generate short-lived or direct HTTPS download URL
export async function getSignedDownloadUrl(
  objectKey: string,
  expiresInSeconds: number = 300
): Promise<string> {
  if (!objectKey) return '';

  // If objectKey is already a direct Cloudinary / HTTPS URL
  if (objectKey.startsWith('http://') || objectKey.startsWith('https://')) {
    return objectKey;
  }

  // If objectKey is a Cloudinary public_id (e.g. contains 'sevya/')
  if (objectKey.startsWith('sevya/') || objectKey.startsWith('proof_')) {
    if (isCloudinaryConfigured()) {
      return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${objectKey}`;
    }
  }

  // If stored in Supabase
  if (isSupabaseStorageConfigured()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(objectKey, expiresInSeconds);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  // Local buffer fallback
  return `/api/v1/storage/local-download?key=${encodeURIComponent(objectKey)}`;
}

// Delete proof file from active engine (Cloudinary, Supabase, Local)
export async function deleteProofFile(objectKey: string): Promise<void> {
  if (!objectKey) return;

  if (objectKey.startsWith('http://') || objectKey.startsWith('https://') || objectKey.includes('cloudinary.com') || objectKey.startsWith('sevya/')) {
    if (isCloudinaryConfigured()) {
      try {
        // Extract public_id from Cloudinary URL if needed
        let publicId = objectKey;
        if (objectKey.includes('/upload/')) {
          const parts = objectKey.split('/upload/');
          if (parts[1]) {
            // Remove version prefix v12345/ if present
            publicId = parts[1].replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
          }
        }
        await deleteFromCloudinary(publicId, 'raw');
        await deleteFromCloudinary(publicId, 'image');
        await deleteFromCloudinary(publicId, 'video');
      } catch (err) {
        console.error(`Failed to delete Cloudinary asset ${objectKey}:`, err);
      }
    }
  }

  if (isSupabaseStorageConfigured()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.storage.from(bucketName).remove([objectKey]);
    } catch (err) {
      console.error(`Failed to delete Supabase Storage object ${objectKey}:`, err);
    }
  }

  localBufferStore.delete(objectKey);
}

// Retrieve buffer for local download stream (dev mode fallback)
export function getLocalStoredBuffer(
  objectKey: string
): { buffer: Buffer; mimeType: string } | null {
  return localBufferStore.get(objectKey) || null;
}
