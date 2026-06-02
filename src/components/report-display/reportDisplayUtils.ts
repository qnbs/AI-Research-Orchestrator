import { marked } from 'marked';
import DOMPurify from 'dompurify';

export const secureMarkdownToHtml = (text: string): string => {
  if (!text) return '';
  const rawMarkup = marked.parse(text.trim(), { breaks: true, gfm: true }) as string;
  return DOMPurify.sanitize(rawMarkup);
};

export const stripMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  const html = marked.parse(markdown) as string;
  const sanitized = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitized;
  return tempDiv.textContent || tempDiv.innerText || '';
};

export const getSummaryCharLimit = (): number => {
  if (typeof window === 'undefined') return 250;
  if (window.innerWidth < 768) return 150;
  if (window.innerWidth < 1280) return 200;
  return 250;
};
