import nodemailer from 'nodemailer';

// Email service configuration
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
      timeout: 10000, // 10 seconds timeout
    });
  }
  return transporter;
}

export function generateOTP(): string {
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  try {
    const mailTransporter = getTransporter();
    
    const mailOptions = {
      from: {
        name: 'Chat App',
        address: process.env.GMAIL_USER || 'noreply@example.com',
      },
      to: email,
      subject: 'Your Verification Code',
      text: `Your verification code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Verification Code</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">Your verification code is:</p>
            <div style="background-color: #f0f8ff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
          </div>
        </div>
      `,
    };

    await mailTransporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
}

// Alternative SendGrid implementation
export async function sendOTPEmailSendGrid(email: string, otp: string): Promise<void> {
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM || 'noreply@example.com',
        name: 'Chat App',
      },
      subject: 'Your Verification Code',
      text: `Your verification code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Verification Code</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">Your verification code is:</p>
            <div style="background-color: #f0f8ff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`OTP email sent to ${email} via SendGrid`);
  } catch (error) {
    console.error('Error sending OTP email via SendGrid:', error);
    throw new Error('Failed to send OTP email');
  }
}

// Email service health check
export async function testEmailService(): Promise<{ success: boolean; message: string }> {
  try {
    // Test Gmail SMTP
    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      const mailTransporter = getTransporter();
      await mailTransporter.verify();
      return { success: true, message: 'Gmail SMTP service is working' };
    }
    
    // Test SendGrid
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      // Send a test email to verify
      const testEmail = {
        to: process.env.GMAIL_USER || 'test@example.com',
        from: process.env.SENDGRID_FROM,
        subject: 'Test Email',
        text: 'This is a test email from your Chat App',
      };
      
      await sgMail.send(testEmail);
      return { success: true, message: 'SendGrid service is working' };
    }
    
    return { success: false, message: 'No email service configured' };
  } catch (error: any) {
    console.error('Email service test failed:', error);
    return { 
      success: false, 
      message: error.message || 'Email service test failed' 
    };
  }
}
