import type { Content } from '@/content/quotes';
import type { Root } from '@/data/schema';

import { levelKey } from './session';

export const FEEDBACK_EMAIL = 'hello@lettercrack.app';

/**
 * "Report quote" (§4.3): nothing is sent online. The quote is hidden locally (never offered as a
 * level again) and listed in the next feedback email. A level save for it is dropped.
 */
export function reportQuote(root: Root, quoteId: number): Root {
  if (root.progress.reportedQuoteIds.includes(quoteId)) return root;
  const inProgress = { ...root.inProgress };
  delete inProgress[levelKey(quoteId)];
  return {
    ...root,
    inProgress,
    progress: { ...root.progress, reportedQuoteIds: [...root.progress.reportedQuoteIds, quoteId] },
  };
}

/** mailto: link for feedback, listing reported quotes. Only opened when the player taps it. */
export function feedbackMailto(root: Root, content: Content, subject: string, appVersion: string): string {
  const reported = root.progress.reportedQuoteIds.map((id) => {
    const q = content.quote(id);
    return q ? `#${id} ${q.author}: ${q.text}` : `#${id}`;
  });
  const lines = [`App ${appVersion}, quotes ${content.version}`, ''];
  if (reported.length) lines.push('Reported quotes:', ...reported, '');
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}
