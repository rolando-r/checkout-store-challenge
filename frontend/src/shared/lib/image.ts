/**
 * Image URL helpers.
 *
 * Product images are stored in the database as bare CDN URLs (Unsplash), which
 * by default serve the full-resolution original — several MB and thousands of
 * pixels wide, even for a 48px thumbnail. The CDN can resize, re-compress and
 * convert to WebP/AVIF on the fly, so instead of downloading the original we
 * ask for exactly the widths the layout needs and let the browser pick one
 * through `srcset`/`sizes`.
 *
 * Any URL we don't know how to resize (relative paths, other hosts) is passed
 * through untouched, so this is safe for every value that can be in the DB.
 */

const RESIZABLE_HOST = 'images.unsplash.com';

export const DEFAULT_IMAGE_WIDTHS = [320, 480, 640, 800, 960] as const;
const DEFAULT_QUALITY = 70;

export interface ImageSources {
  /** Safe fallback for browsers/contexts that ignore `srcset`. */
  src: string;
  /** Undefined when the URL can't be resized. */
  srcSet?: string;
}

function parseResizable(url: string): URL | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname === RESIZABLE_HOST ? parsed : null;
  } catch {
    // Relative or malformed URL: nothing to optimise.
    return null;
  }
}

export function buildImageUrl(url: string, width: number, quality: number = DEFAULT_QUALITY): string {
  const parsed = parseResizable(url);
  if (!parsed) return url;

  parsed.searchParams.set('auto', 'format'); // WebP/AVIF where the browser supports it
  parsed.searchParams.set('fit', 'crop');
  parsed.searchParams.set('w', String(width));
  parsed.searchParams.set('q', String(quality));
  return parsed.toString();
}

export function buildImageSources(
  url: string,
  widths: readonly number[] = DEFAULT_IMAGE_WIDTHS,
): ImageSources {
  if (!parseResizable(url) || widths.length === 0) return { src: url };

  const sorted = [...widths].sort((a, b) => a - b);
  const fallbackWidth = sorted[Math.floor(sorted.length / 2)];

  return {
    src: buildImageUrl(url, fallbackWidth),
    srcSet: sorted.map((width) => `${buildImageUrl(url, width)} ${width}w`).join(', '),
  };
}
