import { describe, expect, it } from 'vitest';
import { SUBJECT_TYPES, getSubjectId, isAnonymousSubject, isAuthenticatedSubject, isGuestSubject, isRegisteredSubject, type IdentitySubject } from './subject';

describe('identity subjects', () => {
  const guest: IdentitySubject = { type: 'guest', guestId: 'guest-1' };
  const anonymous: IdentitySubject = { type: 'anonymous', userId: 'user-1' };
  const registered: IdentitySubject = { type: 'registered', userId: 'user-2' };

  it('contains exactly the supported types', () => {
    expect(SUBJECT_TYPES).toEqual(['guest', 'anonymous', 'registered']);
    expect(new Set(SUBJECT_TYPES).size).toBe(SUBJECT_TYPES.length);
  });
  it('classifies guest', () => {
    expect([isGuestSubject(guest), isAuthenticatedSubject(guest), isAnonymousSubject(guest), isRegisteredSubject(guest)]).toEqual([true, false, false, false]);
    expect(getSubjectId(guest)).toBe('guest-1');
  });
  it('classifies anonymous', () => {
    expect([isGuestSubject(anonymous), isAuthenticatedSubject(anonymous), isAnonymousSubject(anonymous), isRegisteredSubject(anonymous)]).toEqual([false, true, true, false]);
    expect(getSubjectId(anonymous)).toBe('user-1');
  });
  it('classifies registered', () => {
    expect([isGuestSubject(registered), isAuthenticatedSubject(registered), isAnonymousSubject(registered), isRegisteredSubject(registered)]).toEqual([false, true, false, true]);
    expect(getSubjectId(registered)).toBe('user-2');
  });
  it('narrows by the discriminant', () => {
    const ids = [guest, anonymous, registered].map((subject) => subject.type === 'guest' ? subject.guestId : subject.userId);
    expect(ids).toEqual(['guest-1', 'user-1', 'user-2']);
  });
});
