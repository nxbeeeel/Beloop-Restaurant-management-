// Quick Email Test Script
// Run this to test Resend email sending locally

import { Resend } from 'resend';

const RESEND_API_KEY = 're_Rsm64PJQ_KUNaGrkozpNoSCJ1fx9h2xLz';
const RESEND_FROM_EMAIL = 'onboarding@resend.dev';
const TEST_EMAIL = 'nxbeeeel@gmail.com'; // Change this to your email

async function testEmail() {
    console.log('🧪 Testing Resend Email Sending...\n');

    const resend = new Resend(RESEND_API_KEY);

    try {
        console.log('📧 Sending test email to:', TEST_EMAIL);
        console.log('📤 From:', RESEND_FROM_EMAIL);
        console.log('');

        const result = await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to: TEST_EMAIL,
            subject: 'Beloop Test Email',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #e11d48;">✅ Email Test Successful!</h1>
          <p>This is a test email from your Beloop application.</p>
          <p>If you received this, your Resend configuration is working correctly.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Sent at: ${new Date().toISOString()}<br>
            From: ${RESEND_FROM_EMAIL}<br>
            To: ${TEST_EMAIL}
          </p>
        </div>
      `
        });

        console.log('✅ SUCCESS! Email sent!');
        console.log('');
        console.log('📊 Resend Response:');
        console.log(JSON.stringify(result, null, 2));
        console.log('');

        if (result.data?.id) {
            console.log('✅ Email ID:', result.data.id);
            console.log('🔗 Check status at: https://resend.com/emails/' + result.data.id);
        }

        console.log('');
        console.log('📧 Check your inbox at:', TEST_EMAIL);
        console.log('💡 If not in inbox, check spam folder');

    } catch (error: any) {
        console.error('❌ FAILED to send email!');
        console.error('');
        console.error('Error:', error.message);
        console.error('');
        console.error('Full error details:');
        console.error(JSON.stringify(error, null, 2));

        if (error.message?.includes('API key')) {
            console.error('\n💡 Tip: Your API key might be invalid');
        }
        if (error.message?.includes('domain')) {
            console.error('\n💡 Tip: The sending domain might not be verified');
        }
    }
}

testEmail()
    .then(() => console.log('\n✅ Test complete!'))
    .catch((err) => console.error('\n❌ Test failed:', err));
