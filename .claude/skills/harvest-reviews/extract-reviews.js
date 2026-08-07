/**
 * In-page extraction snippet for the /harvest-reviews skill.
 *
 * Evaluate this WHOLE file in the Google Maps place page (Reviews tab open,
 * sorted by Newest) via the Claude in Chrome extension. It auto-scrolls the
 * review feed until no new cards load, expands every truncated review, and
 * returns a JSON string of every review card — raw, straight from the DOM.
 *
 * The returned string must be written to reviews.raw.json EXACTLY as returned
 * (file-write the tool result — never re-type or summarize it). Verbatim text
 * is a house rule; the vitest suite in src/lib/reviews enforces it downstream.
 *
 * Selector notes (Google churns class names; structure-first selectors):
 *  - `div[data-review-id]` — every review card carries this attribute. Cards
 *    nest (outer wrapper + inner block share the id) — we keep the outermost.
 *  - `.MyEned` / `.wiI7pd` — the review-text block. Stable for years, but the
 *    longest-span fallback below survives a rename; `cardInnerText` is always
 *    captured so a human/model can verify against the visible card.
 *  - Owner replies live inside the card; `hasOwnerResponse` flags them so the
 *    ingest script can double-check the text didn't swallow the reply.
 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const firstCard = document.querySelector('div[data-review-id]');
  if (!firstCard) {
    return JSON.stringify({
      error: 'No review cards found. Open the Reviews tab first (and sort by Newest).',
    });
  }

  // The scrollable feed is the nearest ancestor of a card that actually scrolls.
  let feed = firstCard.parentElement;
  while (feed && feed.scrollHeight <= feed.clientHeight + 16) feed = feed.parentElement;
  if (!feed || feed === document.documentElement) {
    return JSON.stringify({ error: 'Could not locate the scrollable review feed.' });
  }

  // Scroll until the card count is stable for 3 consecutive rounds (or 150 rounds).
  let stable = 0;
  let last = 0;
  for (let i = 0; i < 150 && stable < 3; i++) {
    feed.scrollTo(0, feed.scrollHeight);
    await sleep(1400);
    const n = document.querySelectorAll('div[data-review-id]').length;
    if (n === last) stable += 1;
    else {
      stable = 0;
      last = n;
    }
  }

  // Expand truncated reviews. The "More" button text is locale-dependent —
  // match the common English variants and aria-expanded=false fallbacks.
  const expanders = [...document.querySelectorAll('div[data-review-id] button')].filter((b) => {
    const t = (b.textContent || '').trim().toLowerCase();
    return t === 'more' || t === 'see more' || t === 'read more';
  });
  for (const b of expanders) {
    b.click();
    await sleep(80);
  }
  await sleep(600);

  // Dedupe nested cards: keep the outermost element per review id.
  const byId = new Map();
  for (const el of document.querySelectorAll('div[data-review-id]')) {
    const id = el.getAttribute('data-review-id');
    if (!id) continue;
    const prev = byId.get(id);
    if (!prev || el.contains(prev)) byId.set(id, el);
  }

  const reviews = [];
  for (const [reviewId, card] of byId) {
    const starEl = card.querySelector('[role="img"][aria-label*="star" i]');
    const ratingMatch = starEl
      ? (starEl.getAttribute('aria-label') || '').match(/([\d.]+)/)
      : null;

    // Author: the profile button's aria-label is the reviewer's display name.
    const authorBtn = card.querySelector('button[aria-label]');
    const author = authorBtn
      ? (authorBtn.getAttribute('aria-label') || '').replace(/^photo of /i, '').trim()
      : null;

    // Review text: known class first, longest-span fallback second.
    let text =
      card.querySelector('.MyEned .wiI7pd')?.textContent ??
      card.querySelector('.MyEned')?.textContent ??
      '';
    if (!text) {
      for (const s of card.querySelectorAll('span')) {
        const t = s.textContent || '';
        if (t.length > text.length) text = t;
      }
    }

    const avatarImg = card.querySelector('img[src*="googleusercontent"]');

    // Attached customer photos render as background-image buttons/divs.
    const photoUrls = [];
    for (const p of card.querySelectorAll(
      'button[style*="background-image"], div[style*="background-image"]',
    )) {
      const m = (p.getAttribute('style') || '').match(/url\("?(https:[^")]+?)"?\)/);
      if (m && m[1].includes('googleusercontent')) photoUrls.push(m[1]);
    }

    reviews.push({
      reviewId,
      author,
      rating: ratingMatch ? Number(ratingMatch[1]) : null,
      text: text.trim(),
      relativeDate:
        (card.querySelector('span.rsqaWe')?.textContent || '').trim() || null,
      avatarUrl: avatarImg ? avatarImg.src : null,
      photoUrls: [...new Set(photoUrls)],
      hasOwnerResponse: /response from the owner/i.test(card.innerText),
      cardInnerText: card.innerText,
    });
  }

  return JSON.stringify(
    {
      placeUrl: location.href,
      pageTitle: document.title,
      count: reviews.length,
      reviews,
    },
    null,
    2,
  );
})();
