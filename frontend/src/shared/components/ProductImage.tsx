import { useCallback, useState } from 'react';
import { buildImageSources } from '../lib/image';
import styles from './ProductImage.module.css';

interface ProductImageProps {
  src: string;
  alt: string;
  /** Candidate widths (px) offered to the browser through `srcset`. */
  widths?: readonly number[];
  /** Tells the browser how wide the image renders, so it picks the right candidate. */
  sizes?: string;
  /**
   * Above-the-fold image (likely the LCP element): load it eagerly and with
   * high priority. Everything else is lazy-loaded.
   */
  priority?: boolean;
}

type Outcome = { src: string; status: 'loaded' | 'error' };

/**
 * Fills its parent (which owns the size / aspect ratio), so the layout never
 * shifts while the image loads. Shows a shimmering placeholder until the image
 * is ready, fades it in, and falls back to a neutral icon if it fails, instead
 * of leaving the browser's broken-image glyph inside the card.
 */
export function ProductImage({ src, alt, widths, sizes, priority = false }: ProductImageProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Derived from `src` so a new image always starts from "loading" again.
  const status = outcome?.src === src ? outcome.status : 'loading';
  const { src: resolvedSrc, srcSet } = buildImageSources(src, widths);

  // Cached images can finish loading before React attaches `onLoad`, which
  // would leave them invisible forever — check `complete` once on mount.
  const imgRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0) {
        setOutcome({ src, status: 'loaded' });
      }
    },
    [src],
  );

  return (
    <span className={styles.frame} data-status={status}>
      {status === 'error' ? (
        <span className={styles.fallback} role="img" aria-label={`Image unavailable: ${alt}`}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="10" r="1.5" />
            <path d="m21 16-5-5-8 8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : (
        <img
          ref={imgRef}
          className={styles.image}
          src={resolvedSrc}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setOutcome({ src, status: 'loaded' })}
          onError={() => setOutcome({ src, status: 'error' })}
        />
      )}
    </span>
  );
}
