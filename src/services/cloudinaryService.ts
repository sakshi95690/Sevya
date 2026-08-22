import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export function isCloudinaryConfigured(): boolean {
  if (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim() !== '') {
    return true;
  }
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_CLOUD_NAME.trim() !== '' &&
      process.env.CLOUDINARY_API_KEY.trim() !== '' &&
      process.env.CLOUDINARY_API_SECRET.trim() !== ''
  );
}

export function configureCloudinary() {
  if (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim() !== '') {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL.trim(),
      secure: true,
    });
  } else if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
      api_key: process.env.CLOUDINARY_API_KEY.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
      secure: true,
    });
  }
  return cloudinary;
}

export interface CloudinaryUploadParams {
  fileBuffer: Buffer;
  folder?: string;
  originalFileName?: string;
  mimeType?: string;
  publicId?: string;
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  url: string;
  format: string;
  fileSize: number;
  resourceType: string;
  originalFileName: string;
}

/**
 * Determine Cloudinary resource_type based on MIME type or extension
 */
export function getCloudinaryResourceType(mimeType?: string, fileName?: string): 'image' | 'video' | 'raw' | 'auto' {
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'video'; // Cloudinary categorizes audio under 'video'
  }
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
    if (ext && ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg'].includes(ext)) return 'video';
  }
  // PDFs, Word documents, text files should be uploaded as 'raw' or 'auto'
  return 'raw';
}

/**
 * Upload Buffer to Cloudinary
 */
export async function uploadToCloudinary(params: CloudinaryUploadParams): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary credentials are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET or CLOUDINARY_URL in .env');
  }

  const cld = configureCloudinary();
  const folder = params.folder || 'sevya/uploads';
  const resourceType = getCloudinaryResourceType(params.mimeType, params.originalFileName);

  // Sanitize filename for public_id if provided
  const sanitizedFileName = (params.originalFileName || 'file')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const customPublicId = params.publicId || `${sanitizedFileName}_${Date.now()}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cld.uploader.upload_stream(
      {
        folder,
        public_id: customPublicId,
        resource_type: resourceType === 'raw' ? 'auto' : resourceType,
        use_filename: true,
        unique_filename: true,
        overwrite: true,
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(new Error(`Cloudinary Upload Failed: ${error?.message || 'No response returned'}`));
        }

        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          url: result.url || result.secure_url,
          format: result.format || (params.mimeType ? params.mimeType.split('/')[1] : 'file'),
          fileSize: result.bytes || params.fileBuffer.length,
          resourceType: result.resource_type,
          originalFileName: params.originalFileName || 'file',
        });
      }
    );

    uploadStream.end(params.fileBuffer);
  });
}

/**
 * Delete a file/asset from Cloudinary by public_id
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'image'
): Promise<boolean> {
  if (!isCloudinaryConfigured()) {
    return false;
  }

  try {
    const cld = configureCloudinary();
    const result = await cld.uploader.destroy(publicId, {
      resource_type: resourceType === 'raw' ? 'raw' : resourceType,
      invalidate: true,
    });
    return result.result === 'ok' || result.result === 'not_found';
  } catch (err) {
    console.error(`Failed to delete asset ${publicId} from Cloudinary:`, err);
    return false;
  }
}

/**
 * Get Cloudinary status and active configuration info
 */
export function getCloudinaryStatus(): {
  configured: boolean;
  cloudName: string | null;
  message: string;
} {
  const configured = isCloudinaryConfigured();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || (process.env.CLOUDINARY_URL ? 'Configured via CLOUDINARY_URL' : null);

  return {
    configured,
    cloudName,
    message: configured
      ? `Cloudinary is active and ready (Cloud: ${cloudName})`
      : 'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env',
  };
}
