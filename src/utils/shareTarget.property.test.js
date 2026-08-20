import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseSmartText } from '../utils/smartParser';

/**
 * Simulates query parameter extraction and payload extraction logic in App.jsx and Web Share Target
 */
function handleSharedTargetParams({ title, text, url }) {
  const combinedSharedText = [title, text, url]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!combinedSharedText) {
    return { shouldOpen: false, initialText: '', parsed: null };
  }

  const parsed = parseSmartText(combinedSharedText);
  return {
    shouldOpen: true,
    initialText: combinedSharedText,
    parsed
  };
}

describe('Web Share Target & PWA App Shortcuts Property Tests (TASK-14)', () => {
  it('Property 1: handleSharedTargetParams correctly extracts non-empty shared text without throwing', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
          text: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
          url: fc.option(fc.webUrl(), { nil: undefined })
        }),
        (params) => {
          const res = handleSharedTargetParams(params);

          const expectedText = [params.title, params.text, params.url]
            .filter(Boolean)
            .join(' ')
            .trim();

          if (!expectedText) {
            expect(res.shouldOpen).toBe(false);
            expect(res.initialText).toBe('');
          } else {
            expect(res.shouldOpen).toBe(true);
            expect(res.initialText).toBe(expectedText);
            // Parser must return either an object or null without error
            expect(typeof res.parsed === 'object').toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: shared tracking numbers in SMS or URLs are parsed into carrier candidates', () => {
    const samples = [
      {
        title: 'Package Notice',
        text: 'Your package RS948219481IL is ready',
        url: 'https://israelpost.co.il',
        expectedCarrier: 'israel-post',
        expectedTracking: 'RS948219481IL'
      },
      {
        title: 'AliExpress',
        text: 'Your item LP00582910482CN has shipped',
        url: 'https://cainiao.com',
        expectedCarrier: 'cainiao',
        expectedTracking: 'LP00582910482CN'
      }
    ];

    samples.forEach((sample) => {
      const res = handleSharedTargetParams(sample);
      expect(res.shouldOpen).toBe(true);
      expect(res.parsed).not.toBeNull();
      expect(res.parsed.trackingNumber).toBe(sample.expectedTracking);
      expect(res.parsed.carrier).toBe(sample.expectedCarrier);
    });
  });
});
