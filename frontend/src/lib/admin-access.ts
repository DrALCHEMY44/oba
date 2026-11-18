export const TREASURER_ID = "treasurer";

type CandidateSession =
  | {
      user?: { id?: string };
      session?: { id?: string; expiresAt?: Date | string };
    }
  | null
  | undefined;

export function isTreasurerSession(value: CandidateSession, now = Date.now()): boolean {
  return (
    value?.user?.id === TREASURER_ID &&
    Boolean(value.session?.id) &&
    new Date(value.session?.expiresAt ?? 0).getTime() > now
  );
}
