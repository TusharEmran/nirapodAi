import type { AuthOtpResponse } from '@/lib/auth-api';
import type { PendingOtpSession } from '@/lib/auth-session';

export function toPendingOtpSession(response: AuthOtpResponse): PendingOtpSession {
  return {
    userId: response.challenge.userId,
    fullName: response.user.fullName,
    email: response.user.email,
    phone: response.user.phone,
    purpose: response.challenge.purpose,
    expiresAt: response.challenge.expiresAt,
  };
}
