import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies a password', async () => {
    const hash = await service.hash('correct horse battery');
    expect(hash).not.toContain('correct horse battery');
    await expect(service.verify(hash, 'correct horse battery')).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await service.hash('correct horse battery');
    await expect(service.verify(hash, 'wrong password')).resolves.toBe(false);
  });

  it('rejects garbage hashes without throwing', async () => {
    await expect(service.verify('not-a-hash', 'anything')).resolves.toBe(false);
  });

  it('verifyDummy always returns false', async () => {
    await expect(service.verifyDummy('anything')).resolves.toBe(false);
  });
});
