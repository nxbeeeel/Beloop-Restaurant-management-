
import { Resend } from 'resend';
import { redis } from '@/lib/redis'; // Assuming redis is exported from here



const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

const RATE_LIMIT_PREFIX = 'mail_rate_limit:';
const RATE_LIMIT_DURATION = 60 * 5; // 5 minutes

export class MailService {
  /**
   * Send a Brand Invitation email with rate limiting.
   */
  static async sendBrandInvite(email: string, token: string, brandName: string) {
    // 1. Check Rate Limit
    const canSend = await this.checkRateLimit(email, 'brand_invite');
    if (!canSend) {
      console.warn(`[MailService] Rate limit hit for ${email}`);
      return { success: false, error: 'RATE_LIMIT_EXCEEDED' };
    }

    // 2. Generate Link & HTML
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://belooprms.app'
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

    // Remove trailing slash if present to avoid double slash
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const link = `${cleanBaseUrl}/invite/brand?token=${token}`;
    const html = this.getBrandInviteTemplate(brandName, link);

    // 3. Send Email
    try {
      if (!process.env.RESEND_API_KEY) {
        console.log("MOCK EMAIL SENT:", { to: email, link });
        return { success: true, mock: true };
      }

      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'notifications@belooprms.app',
        to: email,
        subject: `Complete your setup for ${brandName}`,
        html: html,
      });

      console.log(`[MailService] Brand invite sent to ${email}`);
      console.log(`[MailService] Resend response:`, JSON.stringify(result, null, 2));
      return { success: true, data: result };
    } catch (error) {
      console.error('[MailService] Error sending email:', error);
      console.error('[MailService] Error details:', JSON.stringify(error, null, 2));
      return { success: false, error };
    }
  }


  /**
   * Send invitation to create a new Brand (Self-Serve/Acid Flow).
   * Link points to /invite/brand to create the tenant.
   */
  static async sendBrandCreationInvite(email: string, token: string, brandName: string) {
    // Reuse logic from sendBrandInvite or just alias it
    return this.sendBrandInvite(email, token, brandName);
  }

  /**
   * Alias for sendBrandInvite to resolve runtime errors where this method is expected.
   * @deprecated Use sendBrandInvite or sendBrandCreationInvite instead.
   */
  static async sendBrandWelcomeInvite(email: string, token: string, brandName: string) {
    return this.sendBrandInvite(email, token, brandName);
  }

  /**
   * Rate limiting helper using Redis.
   * Returns true if email can be sent, false if limited.
   */
  private static async checkRateLimit(identifier: string, type: string): Promise<boolean> {
    if (!redis) return true; // Fail open if no redis

    const key = `${RATE_LIMIT_PREFIX}${type}:${identifier}`;
    const attempts = await redis.incr(key);

    if (attempts === 1) {
      await redis.expire(key, RATE_LIMIT_DURATION);
    }

    // Allow 2 emails per 5 minutes per type
    return attempts <= 2;
  }

  /**
   * HTML Template for Brand Invitation
   */
  private static getBrandInviteTemplate(brandName: string, link: string) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #e11d48 0%, #db2777 100%); padding: 32px; text-align: center; }
            .content { padding: 40px; color: #374151; line-height: 1.6; }
            .button { display: inline-block; background-color: #e11d48; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 24px; }
            .footer { padding: 24px; text-align: center; color: #9ca3af; font-size: 12px; background-color: #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Beloop</h1>
            </div>
            <div class="content">
              <h2>You're almost there!</h2>
              <p>Your application for <strong>${brandName}</strong> has been approved.</p>
              <p>Click the button below to activate your brand account and set up your first outlet.</p>
              <div style="text-align: center;">
                <a href="${link}" class="button">Activate Brand Account</a>
              </div>
              <p style="margin-top: 32px; font-size: 14px; color: #6b7280;">
                Or copy and paste this link into your browser:<br/>
                <a href="${link}" style="color: #e11d48;">${link}</a>
              </p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Beloop Inc. All rights reserved.
            </div>
          </div>
        </body>
      </html>
    `;
  }


  /**
   * Send a User Invitation (Staff/Manager)
   */
  static async sendUserInvite(email: string, token: string, role: string, outletName: string) {
    const canSend = await this.checkRateLimit(email, 'user_invite');
    if (!canSend) return { success: false, error: 'RATE_LIMIT_EXCEEDED' };

    // Ensure we handle local vs prod URL correctly
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://belooprms.app'
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const link = `${cleanBaseUrl}/invite/user?token=${token}`;

    try {
      if (!process.env.RESEND_API_KEY) {
        console.log("MOCK USER INVITE SENT:", { to: email, link });
        return { success: true, mock: true };
      }

      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'notifications@belooprms.app',
        to: email,
        subject: `You've been invited to join ${outletName}`,
        html: `
                  <p>You have been invited to join <strong>${outletName}</strong> as a <strong>${role}</strong>.</p>
                  <p><a href="${link}">Click here to accept invitation</a></p>
                  <p>Or paste this link: ${link}</p>
              `
      });
      console.log(`[MailService] User invite sent to ${email}`);
      console.log(`[MailService] Resend response:`, JSON.stringify(result, null, 2));
      return { success: true, data: result };
    } catch (error) {
      console.error('[MailService] Error:', error);
      console.error('[MailService] Error details:', JSON.stringify(error, null, 2));
      return { success: false, error };
    }
  }
}
