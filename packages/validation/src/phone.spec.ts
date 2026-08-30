import { normalizePhone } from './phone';

describe('normalizePhone', () => {
  it.each([
    ['08012345678', '+2348012345678'],
    ['0801 234 5678', '+2348012345678'],
    ['0801-234-5678', '+2348012345678'],
    ['(0801) 234 5678', '+2348012345678'],
    ['07098765432', '+2347098765432'],
    ['09112345678', '+2349112345678'],
    ['8012345678', '+2348012345678'],
    ['2348012345678', '+2348012345678'],
    ['234 801 234 5678', '+2348012345678'],
    ['+2348012345678', '+2348012345678'],
    ['+234 801 234 5678', '+2348012345678'],
  ])('normalizes Nigerian %s to %s', (input, expected) => {
    const result = normalizePhone(input);
    expect(result.ok).toBe(true);
    expect(result.e164).toBe(expected);
  });

  it('keeps valid non-Nigerian international numbers as-is', () => {
    const result = normalizePhone('+44 7911 123456');
    expect(result.ok).toBe(true);
    expect(result.e164).toBe('+447911123456');
  });

  it.each([
    [''],
    ['   '],
    ['abc'],
    ['0801234567'], // 10 digits with leading 0 — one short
    ['080123456789'], // 12 digits — one long
    ['06012345678'], // invalid Nigerian prefix (060...)
    ['+234801234567'], // +234 with 9 local digits
    ['12345'], // too short, no format matches
    ['+12'], // international too short
    ['0801234567a'], // trailing letter
  ])('rejects invalid input %s', (input) => {
    expect(normalizePhone(input).ok).toBe(false);
  });

  it('returns a helpful error message for invalid Nigerian prefixes', () => {
    const result = normalizePhone('06012345678');
    expect(result.error).toMatch(/070, 080, 081, 090 or 091/);
  });
});
