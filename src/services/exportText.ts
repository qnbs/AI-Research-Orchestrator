import DOMPurify from 'dompurify';
import { BRAND_APP_NAME } from '../lib/brand';

export const APP_NAME = BRAND_APP_NAME;

// Strips tags via a real HTML parser (DOMPurify) rather than a naive `<[^>]*>` regex,
// which can be bypassed by nested/malformed markup that reconstructs a tag once stripped.
// RETURN_DOM_FRAGMENT lets DOMPurify build the DOM itself instead of app code doing its
// own innerHTML assignment - same zero-tag sanitization, decodes HTML entities via
// textContent.
export const stripHtmlTags = (text: string): string => {
  const sanitizedFragment = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    RETURN_DOM_FRAGMENT: true,
  });
  return sanitizedFragment.textContent || '';
};

export const cleanText = (text: string) =>
  text
    ? stripHtmlTags(text)
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
    : '';
