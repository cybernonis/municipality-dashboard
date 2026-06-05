import DOMPurify from 'dompurify';

/**
 * Strip all HTML tags and dangerous content from user-supplied strings.
 * Returns plain text safe for React text nodes.
 */
export const sanitize = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // ALLOWED_TAGS: [] forces DOMPurify to strip every tag, leaving plain text only
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};
