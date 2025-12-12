
import { inngest } from "@/lib/inngest";

export class MailService {
  /**
   * Send a Brand Invitation email asynchronously via Inngest.
   */
  static async sendBrandInvite(email: string, token: string, brandName: string) {
    await inngest.send({
      name: "mail/brand.invite",
      data: { email, token, name: brandName }
    });
    console.log(`[MailService] Queued brand invite for ${email}`);
    return { success: true, queued: true };
  }

  /**
   * Send invitation to create a new Brand (Self-Serve/Acid Flow).
   */
  static async sendBrandCreationInvite(email: string, token: string, brandName: string) {
    return this.sendBrandInvite(email, token, brandName);
  }

  /**
   * Alias for sendBrandInvite to resolve runtime errors.
   */
  static async sendBrandWelcomeInvite(email: string, token: string, brandName: string) {
    return this.sendBrandInvite(email, token, brandName);
  }

  /**
   * Send a User Invitation (Staff/Manager) asynchronously via Inngest.
   */
  static async sendUserInvite(email: string, token: string, role: string, outletName: string) {
    await inngest.send({
      name: "mail/user.invite",
      data: { email, token, role, entityName: outletName }
    });
    console.log(`[MailService] Queued user invite for ${email}`);
    return { success: true, queued: true };
  }
}
