import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../../config/env.js';

let transporter: Transporter;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASSWORD
          ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
          : undefined,
    });
  }
  return transporter;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<void> {
  try {
    await getTransporter().sendMail({
      from: `"Training Market" <${env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
  } catch (error) {
    console.error('Email send failed:', error);
    // Don't throw — email failure should not block auth flows
  }
}

// ---- Email Templates ----

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #F8FAFC; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #FFFFFF; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .logo { font-size: 24px; font-weight: bold; color: #2563EB; margin-bottom: 24px; }
    h1 { font-size: 20px; color: #1E293B; margin: 0 0 16px; }
    p { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: #2563EB; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; }
    .btn:hover { background: #1D4ED8; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #94A3B8; }
    .code { background: #F1F5F9; padding: 12px 16px; border-radius: 6px; font-family: monospace; font-size: 16px; letter-spacing: 2px; text-align: center; color: #1E293B; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">Training Market</div>
      ${content}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Training Market. All rights reserved.<br>
      Malaysia's intelligent training marketplace.
    </div>
  </div>
</body>
</html>`;

export function verificationEmailHtml(name: string, verifyUrl: string): string {
  return baseTemplate(`
    <h1>Welcome to Training Market!</h1>
    <p>Hi ${name},</p>
    <p>Thank you for registering. Please verify your email address to activate your account.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${verifyUrl}" class="btn">Verify Email Address</a>
    </p>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all; font-size: 12px; color: #64748B;">${verifyUrl}</p>
    <p>This link expires in 24 hours.</p>
  `);
}

export function passwordResetEmailHtml(name: string, resetUrl: string): string {
  return baseTemplate(`
    <h1>Reset Your Password</h1>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Click the button below to set a new password.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p>This link expires in 1 hour.</p>
  `);
}

export function welcomeEmailHtml(name: string, role: string): string {
  const roleMessages: Record<string, string> = {
    employer: 'Start discovering training programs for your team. Browse our marketplace, get AI recommendations, and find the perfect training.',
    individual: 'Start exploring training programs to advance your career. Browse by interest, get personalized recommendations, and invest in your growth.',
    provider: 'Complete your profile and subscription to start publishing your training programs. Reach thousands of employers across Malaysia.',
  };

  return baseTemplate(`
    <h1>Welcome to Training Market!</h1>
    <p>Hi ${name},</p>
    <p>Your email has been verified and your account is now active.</p>
    <p>${roleMessages[role] || 'Welcome aboard!'}</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${env.API_BASE_URL.replace(':4000', ':3000')}" class="btn">Go to Dashboard</a>
    </p>
  `);
}

export function accountSuspendedEmailHtml(name: string, reason: string): string {
  return baseTemplate(`
    <h1>Account Suspended</h1>
    <p>Hi ${name},</p>
    <p>Your Training Market account has been suspended.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p>If you believe this is an error, please contact our support team.</p>
  `);
}

export function proposalReceivedEmailHtml(employerName: string, providerName: string, broadcastTitle: string): string {
  return baseTemplate(`
    <h1>New Proposal Received</h1>
    <p>Hi ${employerName},</p>
    <p><strong>${providerName}</strong> submitted a proposal for your training request: <strong>${broadcastTitle}</strong>.</p>
    <p>Log in to review the proposal, compare with others, and select the best fit for your team.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${env.API_BASE_URL.replace(':4000', ':3000')}/employer/dashboard" class="btn">Review Proposal</a>
    </p>
  `);
}

export function proposalSelectedEmailHtml(providerName: string, broadcastTitle: string): string {
  return baseTemplate(`
    <h1>Your Proposal Was Selected!</h1>
    <p>Hi ${providerName},</p>
    <p>Congratulations! Your proposal for <strong>${broadcastTitle}</strong> has been selected by the employer.</p>
    <p>The employer will be in touch to finalize the training details.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${env.API_BASE_URL.replace(':4000', ':3000')}/provider/proposals" class="btn">View Details</a>
    </p>
  `);
}

export function newEnquiryEmailHtml(providerName: string, subject: string, employerName: string): string {
  return baseTemplate(`
    <h1>New Enquiry Received</h1>
    <p>Hi ${providerName},</p>
    <p><strong>${employerName}</strong> sent you an enquiry: <strong>${subject}</strong>.</p>
    <p>Log in to view the details and reply.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${env.API_BASE_URL.replace(':4000', ':3000')}/provider/enquiries" class="btn">View Enquiry</a>
    </p>
  `);
}

export function newBroadcastEmailHtml(providerName: string, broadcastTitle: string): string {
  return baseTemplate(`
    <h1>New Training Request</h1>
    <p>Hi ${providerName},</p>
    <p>An employer is looking for: <strong>${broadcastTitle}</strong>.</p>
    <p>Review the request and submit your proposal to win this training opportunity.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${env.API_BASE_URL.replace(':4000', ':3000')}/provider/broadcasts" class="btn">View & Propose</a>
    </p>
  `);
}

export function providerVerifiedEmailHtml(name: string): string {
  return baseTemplate(`
    <h1>Provider Verified!</h1>
    <p>Hi ${name},</p>
    <p>Congratulations! Your training provider profile has been verified by our team.</p>
    <p>You now have the <strong>Verified</strong> quality tier badge, which is displayed on your profile and program listings.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${env.API_BASE_URL.replace(':4000', ':3000')}/provider/dashboard" class="btn">Go to Dashboard</a>
    </p>
  `);
}
