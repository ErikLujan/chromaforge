// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeHtml, sanitizeSearch } from './sanitization.utils';

describe('sanitizeText', () => {
  it('removes script tags completely', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('');
  });

  it('removes inline event handlers', () => {
    expect(sanitizeText('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('neutralizes javascript: URIs while keeping text', () => {
    expect(sanitizeText('<a href="javascript:alert(1)">click</a>')).toBe('click');
  });

  it('preserves legitimate business names with punctuation', () => {
    expect(sanitizeText("Acme & Sons")).toBe("Acme & Sons");
    expect(sanitizeText("Studio '24")).toBe("Studio '24");
    expect(sanitizeText('Brand-System v2.0')).toBe('Brand-System v2.0');
  });
});

describe('sanitizeHtml', () => {
  it('keeps allowlisted formatting tags', () => {
    expect(sanitizeHtml('<strong>Bold</strong>')).toContain('<strong>Bold</strong>');
  });

  it('removes script and iframe elements', () => {
    const out = sanitizeHtml(
      '<p>ok</p><script>alert(1)</script><iframe src="https://evil.example"></iframe>',
    );
    expect(out).toContain('<p>ok</p>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<iframe');
  });

  it('strips event handlers from allowlisted elements', () => {
    const out = sanitizeHtml('<a href="https://ok.example" onclick="alert(1)">link</a>');
    expect(out).toContain('href="https://ok.example"');
    expect(out).not.toContain('onclick');
  });

  it('preserves legitimate text with punctuation', () => {
    expect(sanitizeHtml("Studio '24")).toBe("Studio '24");
  });
});

describe('sanitizeSearch', () => {
  it('strips HTML and bounds the result length', () => {
    const long = 'a'.repeat(500);
    expect(sanitizeSearch(long).length).toBeLessThanOrEqual(200);
  });

  it('collapses whitespace and removes tags', () => {
    expect(sanitizeSearch('<b>  hello   world  </b>')).toBe('hello world');
  });
});
