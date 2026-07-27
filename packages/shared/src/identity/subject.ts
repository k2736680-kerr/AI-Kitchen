export const SUBJECT_TYPES = ['guest', 'anonymous', 'registered'] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export interface GuestSubject {
  readonly type: 'guest';
  readonly guestId: string;
}
export interface AnonymousSubject {
  readonly type: 'anonymous';
  readonly userId: string;
}
export interface RegisteredSubject {
  readonly type: 'registered';
  readonly userId: string;
}
export type AuthenticatedSubject = AnonymousSubject | RegisteredSubject;
export type IdentitySubject = GuestSubject | AuthenticatedSubject;

export const isGuestSubject = (subject: IdentitySubject): subject is GuestSubject => subject.type === 'guest';
export const isAuthenticatedSubject = (subject: IdentitySubject): subject is AuthenticatedSubject => subject.type !== 'guest';
export const isAnonymousSubject = (subject: IdentitySubject): subject is AnonymousSubject => subject.type === 'anonymous';
export const isRegisteredSubject = (subject: IdentitySubject): subject is RegisteredSubject => subject.type === 'registered';
export const getSubjectId = (subject: IdentitySubject): string => isGuestSubject(subject) ? subject.guestId : subject.userId;
