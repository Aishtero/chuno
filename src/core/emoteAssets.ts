import { ANIMATED_EMOTES, AnimatedEmoteId } from '../data/emotes';

const blobCache = new Map<AnimatedEmoteId, Blob>();
const inflightLoads = new Map<AnimatedEmoteId, Promise<Blob | null>>();

function getSourcePath(id: AnimatedEmoteId): string {
  const found = ANIMATED_EMOTES.find((e) => e.id === id);
  return found ? found.src : `./emotes/emote_04_laugh.webp`;
}

export function preloadEmoteBlob(id: AnimatedEmoteId): Promise<Blob | null> {
  const existing = blobCache.get(id);
  if (existing) return Promise.resolve(existing);

  const pending = inflightLoads.get(id);
  if (pending) return pending;

  if (typeof fetch !== 'function') {
    return Promise.resolve(null);
  }

  const req = fetch(getSourcePath(id))
    .then((res) => (res.ok ? res.blob() : null))
    .then((blob) => {
      if (blob) {
        blobCache.set(id, blob);
      }
      return blob;
    })
    .catch(() => null)
    .finally(() => {
      inflightLoads.delete(id);
    });

  inflightLoads.set(id, req);
  return req;
}

/**
 * Preloads all 10 animated WebP emotes into memory as Blobs so bubbles appear
 * instantaneously with zero network hitch.
 */
export function preloadAllEmoteBlobs(): Promise<void> {
  return Promise.allSettled(ANIMATED_EMOTES.map((item) => preloadEmoteBlob(item.id))).then(() => undefined);
}

export interface FreshEmoteHandle {
  url: string;
  isObjectUrl: boolean;
}

/**
 * Creates a fresh `URL.createObjectURL(blob)` for every bubble display so the browser
 * always starts the animated WebP strictly at frame 1 with zero network latency.
 */
export function createFreshEmoteObjectUrl(id: AnimatedEmoteId): FreshEmoteHandle {
  const blob = blobCache.get(id);
  if (blob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return {
      url: URL.createObjectURL(blob),
      isObjectUrl: true,
    };
  }
  // Kick off background caching for subsequent plays; cache-bust query forces frame 1 now
  void preloadEmoteBlob(id);
  const src = getSourcePath(id);
  return {
    url: `${src}?play=${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    isObjectUrl: false,
  };
}

export function revokeEmoteObjectUrl(handle: FreshEmoteHandle | null | undefined): void {
  if (!handle || !handle.isObjectUrl) return;
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    try {
      URL.revokeObjectURL(handle.url);
    } catch {
      // ignore
    }
  }
}

export function getCachedEmotePreviewUrl(id: AnimatedEmoteId): string {
  return getSourcePath(id);
}
