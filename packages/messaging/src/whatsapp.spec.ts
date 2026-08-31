import { buildWhatsAppLink, encodeMessage, MAX_PREFILL_LENGTH } from './whatsapp';

describe('buildWhatsAppLink', () => {
  const message = 'Hi Ada 😊 You may be due for another Glow Serum.';

  it.each([
    ['08012345678', '2348012345678'],
    ['0801 234 5678', '2348012345678'],
    ['+2348012345678', '2348012345678'],
    ['2348012345678', '2348012345678'],
    ['8012345678', '2348012345678'],
    ['07098765432', '2347098765432'],
  ])('builds a link for the Nigerian number %s', (input, expectedDigits) => {
    const result = buildWhatsAppLink(input, message);
    expect(result.ok).toBe(true);
    expect(result.url).toContain(`https://wa.me/${expectedDigits}?text=`);
    expect(result.phone).toBe(`+${expectedDigits}`);
  });

  it('keeps international numbers', () => {
    const result = buildWhatsAppLink('+44 7911 123456', message);
    expect(result.ok).toBe(true);
    expect(result.url).toContain('https://wa.me/447911123456?text=');
  });

  it('never leaves a "+" or separators in the path', () => {
    const result = buildWhatsAppLink('+234 801-234-5678', message);
    const path = result.url!.split('?')[0]!;
    expect(path).toBe('https://wa.me/2348012345678');
    expect(path).not.toMatch(/[+\-\s()]/);
  });

  const invalidPhones: (string | null | undefined)[] = [
    null,
    undefined,
    '',
    '   ',
    '12345', // too short
    'abcdef', // not digits
    '06012345678', // invalid Nigerian prefix
    '080123456789', // one digit too many
  ];

  it.each(invalidPhones)('rejects the invalid number %s', (phone) => {
    const result = buildWhatsAppLink(phone, message);
    expect(result.ok).toBe(false);
    expect(result.url).toBeUndefined();
    expect(result.error).toBeTruthy();
  });

  it('rejects an empty message', () => {
    expect(buildWhatsAppLink('08012345678', '   ').ok).toBe(false);
  });

  it('rejects a message longer than the prefill limit', () => {
    const result = buildWhatsAppLink('08012345678', 'x'.repeat(MAX_PREFILL_LENGTH + 1));
    expect(result.ok).toBe(false);
    expect(result.error).toContain('longer than');
  });

  it('round-trips the message through the URL unchanged', () => {
    const tricky = "Hi Ada 😊 It's ₦20,000 — 100% due? Call me (please) now!\nThanks";
    const result = buildWhatsAppLink('08012345678', tricky);
    expect(result.ok).toBe(true);

    const url = new URL(result.url!);
    expect(url.searchParams.get('text')).toBe(tricky);
  });
});

describe('encodeMessage', () => {
  it('encodes spaces, newlines and ampersands', () => {
    expect(encodeMessage('a b')).toBe('a%20b');
    expect(encodeMessage('line1\nline2')).toBe('line1%0Aline2');
    expect(encodeMessage('a&b=c')).toBe('a%26b%3Dc');
  });

  it('encodes the characters encodeURIComponent leaves alone', () => {
    expect(encodeMessage("!'()*")).toBe('%21%27%28%29%2A');
  });

  it('encodes the naira sign and emoji', () => {
    expect(encodeMessage('₦')).toBe('%E2%82%A6');
    expect(encodeMessage('😊')).toBe('%F0%9F%98%8A');
  });

  it('produces a value that decodes back to the original', () => {
    const original = 'Hi Ada 😊 — ₦20,000 & 50% (urgent)!';
    expect(decodeURIComponent(encodeMessage(original))).toBe(original);
  });
});
