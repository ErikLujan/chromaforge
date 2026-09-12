import chromaforgeIcon from '@/assets/chromaforge-icon.png';

/**
 * ChromaForgeIcon — custom brand mark component.
 *
 * The single source of truth for the product's own iconography, consumed by
 * every surface that represents the product itself. Any future asset swap
 * happens in this one component; every consumer keeps the same API.
 *
 * The mark is intentionally decorative: the surrounding brand link already
 * names the product, so the image stays empty of `alt` text to avoid double
 * announcement. Consumers may pass an `alt` override where the mark stands
 * alone and needs an accessible name.
 *
 * The PNG is square and rendered with `object-fit: contain` so a future
 * non-square export never distorts. The source asset carries a bright baked
 * rim near its edge, so every consumer class additionally applies a radial
 * feather mask dissolving the outer rim into the ground, plus hard border,
 * shadow, and outline resets. If the rim ever reappears, tighten the mask's
 * opaque stop rather than adding a border to cover it.
 */

interface ChromaForgeIconProps {
  /** Edge length in CSS pixels; the mark is square. */
  readonly size?: number;
  /** Optional CSS module class for layout/decoration overrides. */
  readonly className?: string;
  /** Accessible name override; empty by default (decorative). */
  readonly alt?: string;
}

/**
 * Renders the product brand mark as a decorative image.
 *
 * @param {ChromaForgeIconProps} props Size, class name, and alt override.
 * @returns {JSX.Element} The brand mark image.
 */
export default function ChromaForgeIcon({
  size = 40,
  className,
  alt = '',
}: ChromaForgeIconProps) {
  return (
    <img
      src={chromaforgeIcon}
      alt={alt}
      className={className}
      width={size}
      height={size}
      draggable={false}
      style={{ objectFit: 'contain', borderRadius: '50%' }}
    />
  );
}