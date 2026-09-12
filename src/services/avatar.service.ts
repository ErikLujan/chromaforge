import type { Area } from 'react-easy-crop';
import { supabase } from './supabase.client';

/**
 * Avatar Service — client-side crop, Storage upload, and metadata sync.
 *
 * Owns every step of the avatar lifecycle: `cropImage` turns a
 * react-easy-crop selection into a small square WebP image returned as both a
 * Blob (storage) and a data URL (preview and pending persistence);
 * `uploadAvatar` writes the Blob to the `avatars` bucket under the user's own
 * folder, matching the Storage policies that scope writes to the owner;
 * `setAvatarMetadata` mirrors the public URL into `user_metadata` so the
 * header reads the avatar straight from the session; `syncAvatarUrl` writes
 * the same URL onto the public `profiles` row, the durable cross-device
 * source of truth.
 *
 * Email confirmation means sign-up returns no session, so the cropped avatar
 * is parked in localStorage keyed by email (`savePendingAvatar`) and flushed
 * on the next sign-in (`flushPendingAvatar`, called by the auth store). All
 * storage work is best-effort by design: a failed avatar never blocks an
 * otherwise valid account.
 */

const AVATAR_BUCKET = 'avatars';
const AVATAR_SIZE = 160;
const PENDING_AVATAR_KEY = 'chromaforge:pending-avatar';

export const MAX_AVATAR_BYTES_READABLE = '8 MB';
export const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type CroppedAvatar = { blob: Blob; dataUrl: string };

/**
 * Reports whether an uploaded file has a supported avatar MIME type.
 *
 * @param {File} file The candidate upload.
 * @returns {boolean} `true` when the MIME type is in the allowlist.
 */
export function isSupportedAvatar(file: File): boolean {
  return ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number]);
}

/**
 * Loads an image element from a source URL.
 *
 * @param {string} src Object URL or data URL of the source image.
 * @returns {Promise<HTMLImageElement>} The loaded image element.
 * @throws {Error} When the image cannot be loaded.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    image.src = src;
  });
}

/**
 * Encodes a canvas as a Blob.
 *
 * @param {HTMLCanvasElement} canvas The canvas to encode.
 * @param {string} type The target MIME type.
 * @param {number} quality The encoding quality from 0 to 1.
 * @returns {Promise<Blob>} The encoded image Blob.
 * @throws {Error} When the canvas cannot be encoded.
 */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('No se pudo codificar la imagen.'));
        }
      },
      type,
      quality,
    );
  });
}

/**
 * Decodes a data URL into a Blob.
 *
 * @param {string} dataUrl The data URL to decode.
 * @returns {Blob} The decoded image Blob.
 * @throws {Error} When the data URL is malformed.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const separatorIndex = dataUrl.indexOf(',');
  if (separatorIndex < 0) {
    throw new Error('No se pudo codificar la imagen.');
  }
  const header = dataUrl.slice(0, separatorIndex);
  const payload = dataUrl.slice(separatorIndex + 1);
  if (payload.length === 0) {
    throw new Error('No se pudo codificar la imagen.');
  }
  const mime = /^data:([^;]+);/.exec(header)?.[1] ?? 'image/webp';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Crops the source image to a square avatar. `croppedAreaPixels` comes from
 * react-easy-crop and is expressed in natural-image pixels, so the canvas
 * draw is a direct 1:1 crop scaled to `AVATAR_SIZE`.
 *
 * @param {string} imageSrc Object URL or data URL of the source image.
 * @param {Area} croppedAreaPixels The pixel crop produced by the cropper.
 * @param {number} outputSize Edge length of the square output.
 * @returns {Promise<CroppedAvatar>} The cropped Blob plus a WebP data URL.
 */
export async function cropImage(
  imageSrc: string,
  croppedAreaPixels: Area,
  outputSize = AVATAR_SIZE,
): Promise<CroppedAvatar> {
  const image = await loadImage(imageSrc);

  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  const crop = {
    x: Math.max(0, Math.min(croppedAreaPixels.x, naturalWidth)),
    y: Math.max(0, Math.min(croppedAreaPixels.y, naturalHeight)),
    width: Math.max(1, Math.min(croppedAreaPixels.width, naturalWidth - croppedAreaPixels.x)),
    height: Math.max(1, Math.min(croppedAreaPixels.height, naturalHeight - croppedAreaPixels.y)),
  };

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo acceder al lienzo del navegador.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outputSize, outputSize);

  const blob = await canvasToBlob(canvas, 'image/webp', 0.92);
  const dataUrl = canvas.toDataURL('image/webp', 0.92);

  return { blob, dataUrl };
}

/**
 * Uploads the cropped avatar to Supabase Storage under the user's own folder
 * and returns its public URL, or `null` when the upload failed.
 *
 * The object path is stable (`avatar.webp` is upserted in place), so a
 * cache-busting timestamp is appended: without it a browser holding the old
 * bytes would keep serving the stale image after a replacement.
 *
 * @param {string} userId The auth user id (folder prefix, per RLS).
 * @param {Blob} blob The cropped avatar image.
 * @returns {Promise<string | null>} The cache-busted public avatar URL, or `null`.
 */
export async function uploadAvatar(userId: string, blob: Blob): Promise<string | null> {
  const path = `${userId}/avatar.webp`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'image/webp' });

  if (uploadError) {
    console.warn('[avatar] No se pudo subir el avatar:', uploadError.message);
    return null;
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  return `${data.publicUrl}?t=${Date.now()}`;
}

/**
 * Mirrors the avatar URL into `auth.users.user_metadata.avatar_url` so the
 * header dropdown can render it straight from the session. Best-effort.
 *
 * @param {string} avatarUrl The public avatar URL.
 * @returns {Promise<boolean>} `true` when the metadata was updated.
 */
export async function setAvatarMetadata(avatarUrl: string): Promise<boolean> {
  const { error } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
  if (error) {
    console.warn('[avatar] No se pudo guardar el avatar en el perfil:', error.message);
    return false;
  }
  return true;
}

/**
 * Persists the public avatar URL on the user's `profiles` row — the durable,
 * cross-device source of truth that the auth metadata mirrors. The row is
 * guaranteed to exist because the `handle_new_user` trigger inserts it when
 * the auth user is created, so this is a scoped UPDATE rather than an upsert.
 * Failures are reported as `false` and never block the account.
 *
 * @param {string} userId The auth user id (the `profiles` primary key).
 * @param {string | null} avatarUrl The public avatar URL, or `null` to clear.
 * @returns {Promise<boolean>} `true` when the profile row was written.
 */
export async function syncAvatarUrl(userId: string, avatarUrl: string | null): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (error) {
    console.error(
      '[avatar] No se pudo sincronizar el avatar en la tabla de perfiles:',
      error.message,
    );
    return false;
  }
  return true;
}

/**
 * Derives the localStorage key for a parked avatar.
 *
 * @param {string} email The account email address.
 * @returns {string} The namespaced storage key.
 */
function pendingStorageKey(email: string): string {
  const normalized = email.trim().toLowerCase();
  return `${PENDING_AVATAR_KEY}:${normalized}`;
}

/**
 * Parks the cropped avatar for an account that signed up but has no session
 * yet (email confirmation enabled). Survives page reloads via localStorage.
 * Storage failures are best-effort and ignored; the account remains valid.
 *
 * @param {string} email The registered email address.
 * @param {string} dataUrl The cropped avatar as a WebP data URL.
 * @returns {void}
 */
export function savePendingAvatar(email: string, dataUrl: string): void {
  try {
    localStorage.setItem(pendingStorageKey(email), dataUrl);
  } catch {
    return;
  }
}

/**
 * Reads the parked avatar for an email, or `null`.
 *
 * @param {string} email The account email.
 * @returns {string | null} The stored data URL, if any.
 */
export function getPendingAvatar(email: string): string | null {
  try {
    return localStorage.getItem(pendingStorageKey(email));
  } catch {
    return null;
  }
}

/**
 * Removes a parked avatar from localStorage. Storage failures are ignored.
 *
 * @param {string} email The account email address.
 * @returns {void}
 */
function clearPendingAvatar(email: string): void {
  try {
    localStorage.removeItem(pendingStorageKey(email));
  } catch {
    return;
  }
}

/**
 * Uploads and links a parked avatar once the account actually has a session.
 * Called by the auth store right after sign-in / session-returning sign-up.
 *
 * @param {string} userId The session user id.
 * @param {string} email The account email.
 * @returns {Promise<string | null>} The linked avatar URL, or `null`.
 */
export async function flushPendingAvatar(userId: string, email: string): Promise<string | null> {
  const dataUrl = getPendingAvatar(email);
  if (!dataUrl) return null;

  try {
    const blob = dataUrlToBlob(dataUrl);
    const avatarUrl = await uploadAvatar(userId, blob);
    if (avatarUrl) {
      await setAvatarMetadata(avatarUrl);
      await syncAvatarUrl(userId, avatarUrl);
      clearPendingAvatar(email);
      return avatarUrl;
    }
  } catch (error) {
    console.warn('[avatar] No se pudo enlazar el avatar pendiente:', error);
  }

  return null;
}
