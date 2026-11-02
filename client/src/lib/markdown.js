import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

// Article bodies are Markdown written by admins. They are still sanitised before rendering.
export function renderMarkdown(src = '') {
  return DOMPurify.sanitize(marked.parse(src), { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'iframe', 'form'] });
}
