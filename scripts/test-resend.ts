// Test Resend Email Configuration
// Run this to verify Resend is working correctly

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_Rsm64PJQ_KUNaGrkozpNoSCJ1fx9h2xLz';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

async function testResendConfig() {
    console.log('🔍 Testing Resend Configuration...\n');

    // 1. Check API Key
    console.log('1. API Key Check:');
    console.log(`   RESEND_API_KEY: ${RESEND_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   RESEND_FROM_EMAIL: ${RESEND_FROM_EMAIL}\n`);

    if (!RESEND_API_KEY || RESEND_API_KEY === 're_123456789') {
        console.error('❌ Invalid API key!');
        return;
    }

    // 2. Initialize Resend
    const resend = new Resend(RESEND_API_KEY);
    console.log('2. Resend Client: ✅ Initialized\n');

    // 3. Send Test Email
    console.log('3. Sending Test Email...');

    try {
        const result = await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to: 'test@example.com', // Change this to your email for real test
            subject: 'Beloop - Resend Test Email',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e11d48;">✅ Resend is Working!</h1>
          <p>This is a test email from your Beloop application.</p>
          <p>If you received this, your Resend configuration is correct.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `
        });

        console.log('✅ Email sent successfully!');
        console.log('   Email ID:', result.data?.id);
        console.log('\n📧 Check your inbox at: test@example.com');

    } catch (error: any) {
        console.error('❌ Failed to send email:');
        console.error('   Error:', error.message);

        if (error.message.includes('API key')) {
            console.error('\n💡 Tip: Check if your API key is valid in Resend dashboard');
        }
        if (error.message.includes('domain')) {
            console.error('\n💡 Tip: Verify your sending domain in Resend dashboard');
        }
    }
}

testResendConfig()
    .then(() => console.log('\n✅ Test complete!'))
    .catch((err) => console.error('\n❌ Test failed:', err));
