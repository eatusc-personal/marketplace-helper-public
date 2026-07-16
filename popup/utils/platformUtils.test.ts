import { describe, expect, it } from 'vitest';

import { platformFromUrl } from './platformUtils';

describe('platformFromUrl', () => {
  it.each([
    ['https://www.facebook.com/marketplace/', 'facebook'],
    ['https://nextdoor.com/for_sale_and_free/', 'nextdoor'],
    ['https://newyork.craigslist.org/', 'craigslist'],
    ['https://example.com/', 'other'],
  ])('maps %s to %s', (url, expected) => {
    expect(platformFromUrl(url)).toBe(expected);
  });

  it('rejects lookalike marketplace domains', () => {
    expect(platformFromUrl('https://nextdoor.com.example.net/')).toBe('other');
  });
});
