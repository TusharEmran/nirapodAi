export type PendingOtpSession = {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  purpose: 'signup' | 'login';
  expiresAt: string;
};

let pendingOtpSession: PendingOtpSession | null = null;

export function setPendingOtpSession(session: PendingOtpSession) {
  pendingOtpSession = session;
}

export function getPendingOtpSession() {
  return pendingOtpSession;
}

export function clearPendingOtpSession() {
  pendingOtpSession = null;
}
