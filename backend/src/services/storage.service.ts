/**
 * storage.service.ts
 *
 * Upload/delete strategy (in order):
 *   1. Supabase Storage  — primary
 *   2. Cloudinary        — secondary fallback
 *   3. Local disk        — last-resort fallback
 *
 * Each URL is prefixed with a provider tag so deleteFile knows
 * which SDK to use: "supabase:<url>", "cloudinary:<publicId>", or the
 * raw local path URL (no prefix needed — it matches the backend origin).
 */

import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';

// ─── WebSocket polyfill for Supabase in Node < 22 ────────────────────────────
if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.WebSocket = require('ws') as unknown as typeof WebSocket;
}

// ─── Supabase client ─────────────────────────────────────────────────────────
const supabase =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
    : null;

// ─── Cloudinary client ───────────────────────────────────────────────────────
const cloudinaryReady =
  !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

if (cloudinaryReady) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

// ─── Startup logs ────────────────────────────────────────────────────────────
console.log(
  supabase
    ? '⚡ Storage: Supabase primary ready'
    : '⚠️  Storage: Supabase NOT configured (will skip)',
);
console.log(
  cloudinaryReady
    ? '⚡ Storage: Cloudinary secondary ready'
    : '⚠️  Storage: Cloudinary NOT configured (will skip)',
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uniqueFilename(originalname: string): string {
  const ext = originalname.split('.').pop() ?? 'bin';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
}

function getBackendBase(): string {
  if (env.BACKEND_URL) return env.BACKEND_URL;
  if (env.NODE_ENV === 'production' && process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return `http://localhost:${env.PORT || 4000}`;
}

// ─── Provider: Supabase ───────────────────────────────────────────────────────
async function uploadToSupabase(
  file: Express.Multer.File,
  folder: string,
): Promise<string | null> {
  if (!supabase) return null;

  const bucket = env.SUPABASE_STORAGE_BUCKET ?? 'devos-files';
  const filename = uniqueFilename(file.originalname);
  const fullPath = `${folder}/${filename}`;

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fullPath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fullPath);

    const url = publicUrlData.publicUrl;
    console.log(`✅ [Supabase] Uploaded → ${url}`);
    return url; // raw Supabase URL — no prefix needed, detected by domain
  } catch (err: any) {
    console.warn(`⚠️  [Supabase] Upload failed: ${err?.message ?? err}`);
    return null;
  }
}

// ─── Provider: Cloudinary ─────────────────────────────────────────────────────
async function uploadToCloudinary(
  file: Express.Multer.File,
  folder: string,
): Promise<string | null> {
  if (!cloudinaryReady) return null;

  try {
    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `devos/${folder}`,
            resource_type: 'raw', // PDFs / arbitrary files
            use_filename: false,
          },
          (err, result) => {
            if (err || !result) return reject(err ?? new Error('No result'));
            resolve(result as { secure_url: string; public_id: string });
          },
        );
        uploadStream.end(file.buffer);
      },
    );

    // Prefix publicId so deleteFile can identify Cloudinary URLs
    const url = `cloudinary:${result.public_id}||${result.secure_url}`;
    console.log(`✅ [Cloudinary] Uploaded → ${result.secure_url} (id: ${result.public_id})`);
    return url;
  } catch (err: any) {
    console.warn(`⚠️  [Cloudinary] Upload failed: ${err?.message ?? err}`);
    return null;
  }
}

// ─── Provider: Local disk ─────────────────────────────────────────────────────
async function uploadToLocal(
  file: Express.Multer.File,
  folder: string,
): Promise<string> {
  const filename = uniqueFilename(file.originalname);
  const uploadDir = path.join(process.cwd(), 'uploads', folder);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
  const url = `${getBackendBase()}/uploads/${folder}/${filename}`;
  console.log(`✅ [Local] Saved → ${url}`);
  return url;
}

// ─── Public: uploadFile ───────────────────────────────────────────────────────
export const uploadFile = async (
  file: Express.Multer.File,
  folder: string,
  _requireSupabase: boolean = false, // kept for API compat — no longer throws
): Promise<string> => {
  // 1. Try Supabase
  const supabaseUrl = await uploadToSupabase(file, folder);
  if (supabaseUrl) return supabaseUrl;

  // 2. Try Cloudinary
  const cloudinaryUrl = await uploadToCloudinary(file, folder);
  if (cloudinaryUrl) return cloudinaryUrl;

  // 3. Local disk (always succeeds)
  return uploadToLocal(file, folder);
};

// ─── Public: deleteFile ───────────────────────────────────────────────────────
export const deleteFile = async (fileUrl: string): Promise<void> => {
  if (!fileUrl) return;

  // ── Cloudinary ──
  if (fileUrl.startsWith('cloudinary:')) {
    // Format: cloudinary:<publicId>||<secureUrl>
    const publicId = fileUrl.slice('cloudinary:'.length).split('||')[0];
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      console.log(`🗑️  [Cloudinary] Deleted: ${publicId}`);
    } catch (err: any) {
      console.error(`❌ [Cloudinary] Delete failed: ${err?.message ?? err}`);
    }
    return;
  }

  // ── Supabase — URL contains supabase.co domain ──
  if (supabase && fileUrl.includes('supabase.co')) {
    try {
      const bucket = env.SUPABASE_STORAGE_BUCKET ?? 'devos-files';
      const prefix = `/storage/v1/object/public/${bucket}/`;
      const urlObj = new URL(fileUrl);
      const pathname = decodeURIComponent(urlObj.pathname);
      if (pathname.includes(prefix)) {
        const filePath = pathname.split(prefix)[1];
        const { error } = await supabase.storage.from(bucket).remove([filePath]);
        if (error) throw error;
        console.log(`🗑️  [Supabase] Deleted: ${filePath}`);
      }
    } catch (err: any) {
      console.error(`❌ [Supabase] Delete failed: ${err?.message ?? err}`);
    }
    return;
  }

  // ── Local disk ──
  try {
    const backendBase = getBackendBase();
    if (fileUrl.startsWith(backendBase)) {
      const relativePath = fileUrl.replace(backendBase, '');
      const localPath = path.join(process.cwd(), relativePath);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`🗑️  [Local] Deleted: ${localPath}`);
      }
    }
  } catch (err: any) {
    console.error(`❌ [Local] Delete failed: ${err?.message ?? err}`);
  }
};

/**
 * Extracts the actual public URL from a stored fileUrl.
 * Cloudinary URLs are stored as "cloudinary:<id>||<url>" — this unwraps them.
 * Supabase and local URLs are returned as-is.
 */
export const resolveFileUrl = (fileUrl: string): string => {
  if (fileUrl?.startsWith('cloudinary:')) {
    return fileUrl.split('||')[1] ?? fileUrl;
  }
  return fileUrl;
};
