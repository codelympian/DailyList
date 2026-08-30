import { createBusinessSchema } from './business';

describe('createBusinessSchema', () => {
  it('accepts a name with optional industry', () => {
    const result = createBusinessSchema.parse({ name: "  Ada's Glow  ", industry: 'Beauty' });
    expect(result.name).toBe("Ada's Glow");
    expect(result.industry).toBe('Beauty');
  });

  it('treats an empty industry string as undefined', () => {
    const result = createBusinessSchema.parse({ name: 'Shop', industry: '' });
    expect(result.industry).toBeUndefined();
  });

  it('rejects a too-short name', () => {
    expect(createBusinessSchema.safeParse({ name: 'A' }).success).toBe(false);
  });
});
