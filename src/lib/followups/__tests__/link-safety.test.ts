import { describe, it, expect } from 'vitest';

import { resolveSameOriginUrl } from '../links';

const BASE = 'https://partyondelivery.com';

describe('resolveSameOriginUrl — open-redirect guard (CWE-601)', () => {
  it('keeps legitimate site-relative paths', () => {
    expect(resolveSameOriginUrl('/wedding-drink-calculator', BASE).toString()).toBe(
      'https://partyondelivery.com/wedding-drink-calculator',
    );
    expect(resolveSameOriginUrl('/order', BASE).pathname).toBe('/order');
    expect(
      resolveSameOriginUrl('/austin-bachelorette-party-delivery', BASE).origin,
    ).toBe(BASE);
  });

  it('neutralizes every escape vector to the site root', () => {
    for (const evil of [
      '/\\evil.com', // backslash — WHATWG treats as `/`, becomes //evil.com
      '//evil.com', // protocol-relative
      '/\t/evil.com', // embedded tab stripped -> //evil.com
      '/\n/evil.com', // embedded newline stripped
      'https://evil.com', // absolute
      'http://evil.com/phish', // absolute, different scheme
      '\\\\evil.com', // double backslash
      'javascript:alert(1)', // non-http scheme
    ]) {
      const url = resolveSameOriginUrl(evil, BASE);
      expect(url.origin, `escape not neutralized: ${JSON.stringify(evil)}`).toBe(
        BASE,
      );
    }
  });

  it('falls back to the site root on empty / unparseable input', () => {
    expect(resolveSameOriginUrl('', BASE).origin).toBe(BASE);
    expect(resolveSameOriginUrl('   ', BASE).origin).toBe(BASE);
  });
});
