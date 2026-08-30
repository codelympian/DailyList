import { loginSchema, registerSchema } from './auth';

describe('registerSchema', () => {
  const valid = { name: 'Ada Okafor', email: 'Ada@Example.com ', password: 'sup3rsecret' };

  it('accepts valid input and normalizes email to lowercase', () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe('ada@example.com');
    expect(result.name).toBe('Ada Okafor');
  });

  it('rejects invalid email', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });

  it('rejects a one-character name', () => {
    expect(registerSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts email and any non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'ada@example.com', password: 'x' }).success).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'ada@example.com', password: '' }).success).toBe(false);
  });
});
