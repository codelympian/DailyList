import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { PasswordService } from './password.service';
import type { SessionService } from './session.service';
import type { PrismaService } from '../prisma/prisma.service';

const user = {
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada',
  passwordHash: 'hashed',
};

function buildService(overrides?: { existingUser?: typeof user | null; verifies?: boolean }) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(overrides?.existingUser ?? null),
      create: jest.fn().mockResolvedValue(user),
    },
  } as unknown as PrismaService;

  const passwords = {
    hash: jest.fn().mockResolvedValue('hashed'),
    verify: jest.fn().mockResolvedValue(overrides?.verifies ?? false),
    verifyDummy: jest.fn().mockResolvedValue(false),
  };

  const sessions = {
    createSession: jest.fn().mockResolvedValue('raw-token'),
  };

  const service = new AuthService(
    prisma,
    passwords as unknown as PasswordService,
    sessions as unknown as SessionService,
  );
  return { service, prisma, passwords, sessions };
}

describe('AuthService', () => {
  const input = { name: 'Ada', email: 'ada@example.com', password: 'sup3rsecret' };

  it('registers a new user and creates a session', async () => {
    const { service, sessions } = buildService();
    const result = await service.register(input);
    expect(result.user).toEqual({ id: 'user-1', email: 'ada@example.com', name: 'Ada' });
    expect(result.token).toBe('raw-token');
    expect(sessions.createSession).toHaveBeenCalledWith('user-1');
  });

  it('rejects registration for an existing email with 409', async () => {
    const { service } = buildService({ existingUser: user });
    await expect(service.register(input)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects login with a wrong password', async () => {
    const { service } = buildService({ existingUser: user, verifies: false });
    await expect(
      service.login({ email: 'ada@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('burns dummy verification time for unknown emails (no user enumeration)', async () => {
    const { service, passwords } = buildService({ existingUser: null });
    await expect(
      service.login({ email: 'ghost@example.com', password: 'whatever' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(passwords.verifyDummy).toHaveBeenCalled();
  });

  it('logs in with the correct password', async () => {
    const { service } = buildService({ existingUser: user, verifies: true });
    const result = await service.login({ email: 'ada@example.com', password: 'sup3rsecret' });
    expect(result.token).toBe('raw-token');
  });
});
