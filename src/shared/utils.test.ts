import { describe, expect, it } from 'vitest';

import { detectPlatform } from './utils';

describe('detectPlatform', () => {
  it.each([
    ['https://www.facebook.com/marketplace/create/item', 'facebook'],
    ['https://nextdoor.com/for_sale_and_free/', 'nextdoor'],
    ['https://sfbay.craigslist.org/', 'craigslist'],
    ['https://example.com/listing', 'unknown'],
  ])('maps %s to %s', (url, expected) => {
    expect(detectPlatform(url)).toBe(expected);
  });

  it('does not mistake lookalike domains for a supported platform', () => {
    expect(detectPlatform('https://facebook.com.example.net/')).toBe('unknown');
  });
});
