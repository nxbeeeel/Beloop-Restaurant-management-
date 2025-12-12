import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || 'Beloop <noreply@belooprms.app>';

export class MailService {
  /**
   * Send a Brand Invitation email directly via Resend (no Inngest).
   */
  static async sendBrandInvite(email: string, token: string, brandName: string) {
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/brand?token=${token}`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: `🚀 Set up ${brandName} on Beloop`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0c0a09; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #1c1917 0%, #292524 100%); border: 1px solid #44403c; border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); border-radius: 16px; margin: 0 auto 16px;"></div>
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">Brand Setup</h1>
                    <p style="margin: 8px 0 0; color: #a8a29e; font-size: 16px;">Complete your workspace configuration</p>
                </div>
                
                <div style="background: #1c1917; padding: 32px; border-radius: 0 0 16px 16px; border: 1px solid #44403c; border-top: none;">
                    <h2 style="margin: 0 0 16px; color: #fafaf9; font-size: 20px; font-weight: 600;">Ready to launch <span style="color: #e11d48;">${brandName}</span>?</h2>
                    <p style="margin: 0 0 24px; color: #a8a29e; font-size: 16px; line-height: 1.6;">
                        Your brand workspace has been prepared. Click below to configure your settings.
                    </p>
                    
                    <a href="${inviteUrl}" style="display: block; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; text-align: center; font-weight: 600; font-size: 16px;">
                        Initialize Brand →
                    </a>
                </div>
                
                <p style="text-align: center; color: #57534e; font-size: 12px; margin: 24px 0 0;">
                    © ${new Date().getFullYear()} Beloop · Restaurant Management
                </p>
            </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('[MailService] Brand invite error:', error);
      throw error;
    }

    console.log(`[MailService] Brand invite sent to ${email}`);
    return { success: true, data };
  }

  /**
   * Alias for sendBrandInvite.
   */
  static async sendBrandCreationInvite(email: string, token: string, brandName: string) {
    return this.sendBrandInvite(email, token, brandName);
  }

  /**
   * Alias for sendBrandInvite.
   */
  static async sendBrandWelcomeInvite(email: string, token: string, brandName: string) {
    return this.sendBrandInvite(email, token, brandName);
  }

  /**
   * Send a User Invitation (Staff/Manager) directly via Resend.
   */
  static async sendUserInvite(email: string, token: string, role: string, entityName: string) {
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/user?token=${token}`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: `You're invited to ${entityName} 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">Welcome to Beloop</h1>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Restaurant Management Platform</p>
                </div>
                
                <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                    <h2 style="margin: 0 0 16px; color: #18181b; font-size: 20px; font-weight: 600;">You've been invited!</h2>
                    <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        <strong style="color: #18181b;">${entityName}</strong> has invited you to join as a <strong style="color: #e11d48;">${role}</strong>.
                    </p>
                    
                    <a href="${inviteUrl}" style="display: block; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; text-align: center; font-weight: 600; font-size: 16px;">
                        Accept Invitation →
                    </a>
                </div>
                
                <p style="text-align: center; color: #a1a1aa; font-size: 12px; margin: 24px 0 0;">
                    © ${new Date().getFullYear()} Beloop · Restaurant Management
                </p>
            </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('[MailService] User invite error:', error);
      throw error;
    }

    console.log(`[MailService] User invite sent to ${email}`);
    return { success: true, data };
  }
}
