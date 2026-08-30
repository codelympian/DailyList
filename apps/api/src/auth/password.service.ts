import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

// Hash of an empty-ish password used to equalize timing when the email
// does not exist (prevents user enumeration via response-time differences).
const DUMMY_HASH_INPUT = 'dailylist-dummy-password-for-timing';

@Injectable()
export class PasswordService {
  private dummyHashPromise: Promise<string> | null = null;

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain).catch(() => false);
  }

  /** Burns the same CPU time as a real verification, always returns false. */
  async verifyDummy(plain: string): Promise<boolean> {
    this.dummyHashPromise ??= this.hash(DUMMY_HASH_INPUT);
    const dummyHash = await this.dummyHashPromise;
    await this.verify(dummyHash, plain);
    return false;
  }
}
