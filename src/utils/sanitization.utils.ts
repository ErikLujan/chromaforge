import DOMPurify from 'dompurify';

/**
 * Centralized sanitization boundary.
 *
 * DOMPurify is the single sanitization mechanism for ChromaForge. Every
 * untrusted string crosses one of the functions below so the policy stays in
 * one place. Ordinary user text should usually render through normal React
 * JSX, which escapes automatically; these helpers exist for values that are
 * persisted, logged, or rendered as HTML and must first be made safe.
 */

/** Maximum length for a normalized search term. */
const MAX_SEARCH_LENGTH = 200;

/**
 * Strips every tag and attribute, leaving only plain text. Safe to embed in any
 * context because no executable markup can survive the empty allowlist.
 */
const PLAIN_TEXT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
};

/**
 * Narrow allowlist for the rare cases where user-controlled rich formatting is
 * genuinely required. Scripts, event handlers, and dangerous URI schemes are
 * rejected by DOMPurify's default URI policy; only basic inline/block
 * formatting and safe links remain.
 */
const RICH_HTML_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
    'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'span', 'hr',
  ],
  ALLOWED_ATTR: ['href'],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitizes user-controlled text before it crosses a trusted rendering boundary.
 *
 * @param {string} value - Text to sanitize.
 * @returns {string} Sanitized text safe for plain-text rendering or storage.
 */
export function sanitizeText(value: string): string {
  if (typeof value !== 'string') return '';
  return DOMPurify.sanitize(value, PLAIN_TEXT_CONFIG);
}

/**
 * Sanitizes user-controlled HTML using the application's approved policy.
 *
 * @param {string} value - HTML content to sanitize.
 * @returns {string} Sanitized HTML restricted to the allowlisted tags/attributes.
 */
export function sanitizeHtml(value: string): string {
  if (typeof value !== 'string') return '';
  return DOMPurify.sanitize(value, RICH_HTML_CONFIG);
}

/**
 * Normalizes and sanitizes a user-provided search value.
 *
 * @param {string} value - Search value to process.
 * @returns {string} Sanitized, length-bounded search value.
 */
export function sanitizeSearch(value: string): string {
  if (typeof value !== 'string') return '';
  const collapsed = value.trim().replace(/\s+/g, ' ');
  const stripped = DOMPurify.sanitize(collapsed, PLAIN_TEXT_CONFIG).trim();
  return stripped.slice(0, MAX_SEARCH_LENGTH);
}
