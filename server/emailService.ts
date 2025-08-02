import { MailService } from '@sendgrid/mail';

// Create email service
const isDevelopment = process.env.NODE_ENV === 'development';

let mailService: MailService | null = null;

// Initialize SendGrid for production
if (!isDevelopment && process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendOtpEmail(email: string, otpCode: string, type: 'verification' | 'password-reset' = 'verification'): Promise<void> {
  // In development mode, just log the OTP to console
  if (isDevelopment) {
    console.log(`\n=== EMAIL OTP ${type.toUpperCase()} (DEVELOPMENT MODE) ===`);
    console.log(`Email: ${email}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log(`Type: ${type}`);
    console.log('Copy this code to complete the process');
    console.log('===============================================\n');
    return;
  }

  // In production, send actual email using SendGrid
  const isPasswordReset = type === 'password-reset';
  
  const emailData = {
    to: email,
    from: 'sukrit1990@gmail.com', // Verified sender email
    subject: isPasswordReset ? 'Reset your CryptoInvest Pro password' : 'Verify your CryptoInvest Pro account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">CryptoInvest Pro</h1>
          <p style="color: #6b7280; margin: 5px 0;">Intelligent Crypto Investment Platform</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 30px; text-align: center;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">
            ${isPasswordReset ? 'Reset Your Password' : 'Verify Your Email Address'}
          </h2>
          <p style="color: #4b5563; margin-bottom: 30px; line-height: 1.6;">
            ${isPasswordReset 
              ? 'You requested a password reset for your CryptoInvest Pro account. Please enter the following code to reset your password:' 
              : 'Welcome to CryptoInvest Pro! Please enter the following verification code to complete your account setup:'
            }
          </p>
          
          <div style="background: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; display: inline-block;">
            <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${otpCode}
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This code will expire in 10 minutes for security reasons.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            ${isPasswordReset 
              ? 'If you didn\'t request a password reset, please ignore this email and your password will remain unchanged.' 
              : 'If you didn\'t request this verification code, please ignore this email.'
            }
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2025 CryptoInvest Pro. All rights reserved.
          </p>
        </div>
      </div>
    `
  };

  try {
    if (mailService) {
      await mailService.send(emailData);
      console.log(`OTP email sent successfully to ${email} via SendGrid`);
    } else {
      console.error('SendGrid service not initialized - missing SENDGRID_API_KEY');
      throw new Error('Email service not configured');
    }
  } catch (error: any) {
    console.error('Error sending OTP email via SendGrid:', error);
    
    // Provide more specific error information
    if (error.response?.body?.errors) {
      console.error('SendGrid errors:', error.response.body.errors);
    }
    
    throw new Error('Failed to send verification email. Please try again or contact support.');
  }
}

// Generate a 6-digit OTP code
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}