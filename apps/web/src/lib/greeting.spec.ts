import { getGreeting } from './greeting';

describe('getGreeting', () => {
  it('greets good morning before noon', () => {
    expect(getGreeting(new Date('2026-08-30T08:00:00'))).toBe('Good morning 👋');
  });

  it('greets good afternoon between noon and 5pm', () => {
    expect(getGreeting(new Date('2026-08-30T13:30:00'))).toBe('Good afternoon 👋');
  });

  it('greets good evening from 5pm', () => {
    expect(getGreeting(new Date('2026-08-30T19:00:00'))).toBe('Good evening 👋');
  });
});
