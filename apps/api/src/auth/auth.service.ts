import { Injectable } from '@nestjs/common';

/**
 * Handles identity verification BEFORE queue entry.
 * Unlike IRCTC's approach (Aadhaar OTP during booking),
 * we verify identity once at setup and cache it for the session.
 */
@Injectable()
export class AuthService {
  private verifiedSessions = new Map<string, { verified: boolean; method: string }>();

  /**
   * Verify identity via phone OTP or Aadhaar
   * In production, this would call an actual OTP/Aadhaar verification API.
   * For demo, we accept any phone that matches the 10-digit pattern.
   */
  async verifyIdentity(phone: string): Promise<{ verified: boolean; sessionToken: string }> {
    // Simulated verification — in production use actual OTP service
    const isValid = /^\d{10}$/.test(phone);
    if (!isValid) {
      return { verified: false, sessionToken: '' };
    }

    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.verifiedSessions.set(sessionToken, { verified: true, method: 'phone' });

    return { verified: true, sessionToken };
  }

  /**
   * Check if a session is verified
   */
  isSessionVerified(sessionToken: string): boolean {
    return this.verifiedSessions.get(sessionToken)?.verified ?? false;
  }

  /**
   * Get identity hash for trust profile lookup
   */
  getIdentityHash(phone: string): string {
    // In production, use a proper hash function
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(phone).digest('hex');
  }
}
