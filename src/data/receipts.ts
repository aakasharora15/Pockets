import { getDoc, writeBatch, type Bytes } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { outboxReceipt, saveReceiptDoc } from './outbox';
import { commit } from './pockets';
import { receiptRef } from './refs';

/**
 * Receipt photos are kept in Firestore, one compressed JPEG per expense, rather than in Cloud
 * Storage: new Storage buckets need Firebase's paid plan, and this keeps Spendr on the free one.
 * A photo is shrunk to at most 1600 px and under 850 KB (Firestore documents max out at 1 MB).
 */

export interface Photo {
  blob: Blob;
  width: number;
  height: number;
}

const MAX_SIDE = 1600;
const MAX_BYTES = 850_000;

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode photo'))), 'image/jpeg', quality));
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* fall back to <img> (older Safari, HEIC) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** Shrinks a photo from the camera or library to a JPEG small enough to store. */
export async function compressPhoto(file: Blob): Promise<Photo> {
  const img = await decode(file);
  try {
    let scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    for (let attempt = 0; attempt < 6; attempt++) {
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img.source, 0, 0, width, height);
      for (const q of [0.78, 0.66, 0.54]) {
        const blob = await toBlob(canvas, q);
        if (blob.size <= MAX_BYTES) return { blob, width, height };
      }
      scale *= 0.75;
    }
    throw new Error('Photo too large');
  } finally {
    img.close();
  }
}

export async function saveReceipt(pid: string, eid: string, photo: Photo): Promise<void> {
  await saveReceiptDoc(auth.currentUser?.uid ?? '', pid, eid, photo.blob, photo.width, photo.height);
}

/** The photo for an expense: from this phone if it hasn't synced yet, otherwise from Firestore. */
export async function loadReceipt(pid: string, eid: string): Promise<Photo | null> {
  const waiting = outboxReceipt(pid, eid);
  if (waiting) return { blob: waiting.blob, width: waiting.width, height: waiting.height };
  const snap = await getDoc(receiptRef(pid, eid));
  if (!snap.exists()) return null;
  const d = snap.data() as { data: Bytes; width: number; height: number };
  return { blob: new Blob([d.data.toUint8Array() as BlobPart], { type: 'image/jpeg' }), width: d.width, height: d.height };
}

export async function deleteReceipt(pid: string, eid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(receiptRef(pid, eid));
  await commit(batch);
}
