import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import { Injectable, Logger } from '@nestjs/common';

export interface EmailVerificationData {
  firstName: string;
  email: string;
  role: string;
  registrationDate: string;
  verificationUrl: string;
  baseUrl: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Configure your email provider here
    // Example for Gmail/Google Workspace
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

  }



  private loadTemplate(templateName: string): string {
    try {
      const templatePath = path.join(
        process.cwd(),
        'src',
        'templates',
        `${templateName}.html`,
      );
      return fs.readFileSync(templatePath, 'utf-8');
    } catch (error) {
      this.logger.error(
        `Failed to load email template: ${templateName}`,
        error,
      );
      throw new Error(`Email template not found: ${templateName}`);
    }
  }

  private replaceTemplateVariables(
    template: string,
    data: Record<string, any>,
  ): string {
    let result = template;

    // Replace all {{variable}} placeholders with actual data
    Object.keys(data).forEach((key) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, data[key] || '');
    });

    return result;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: {
          name: 'DentistPortal',
          address: process.env.SMTP_FROM || 'noreply@dentistportal.com',
        },
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(
        `Email sent successfully to ${options.to}`,
        info.messageId,
      );

      // Log preview URL for development
      if (process.env.NODE_ENV === 'development') {
        this.logger.log('Preview URL: ' + nodemailer.getTestMessageUrl(info));
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      return false;
    }
  }

  async sendVerificationEmail(data: EmailVerificationData): Promise<boolean> {
    try {
      // Load the email template
      const template = this.loadTemplate('email-verification');

      // Replace template variables
      const html = this.replaceTemplateVariables(template, data);

      // Create plain text version
      const text = this.generatePlainTextVersion(data);

      // Send the email
      return await this.sendEmail({
        to: data.email,
        subject: 'Verify Your DentistPortal Account',
        html,
        text,
      });
    } catch (error) {
      this.logger.error('Failed to send verification email', error);
      return false;
    }
  }

  private generatePlainTextVersion(data: EmailVerificationData): string {
    return `
Hello ${data.firstName}!

Thank you for joining Aligner360, the trusted network of dental professionals.

To complete your registration and ensure the security of your account, please verify your email address by clicking the link below:

${data.verificationUrl}

Your Account Details:
- Email: ${data.email}
- Account Type: ${data.role}
- Registration Date: ${data.registrationDate}

This verification link will expire in 24 hours for your security.

Once verified, you'll have access to:
• Search & Connect - Find verified dental professionals in your area
• Professional Profiles - Showcase your expertise and credentials  
• Secure Communication - HIPAA-compliant messaging system
• Practice Insights - Analytics and growth tools
• Trust & Verification - Badge system for credibility

Need help? Contact us at support@dentistportal.com

Best regards,
The DentistPortal Team

© 2025 DentistPortal. All rights reserved.
Professional Dental Network | Trusted by 10,000+ Professionals
    `.trim();
  }

  async sendWelcomeEmail(data: {
    firstName: string;
    email: string;
    role: string;
    loginUrl: string;
  }): Promise<boolean> {
    // You can create another template for welcome emails
    const html = `
      <h1>Welcome to Aligner360, ${data.firstName}!</h1>
      <p>Your account has been successfully verified and is now active.</p>
      <p>You can now log in to your ${data.role.toLowerCase()} account:</p>
      <a href="${data.loginUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        Access Your Account
      </a>
    `;

    return await this.sendEmail({
      to: data.email,
      subject: 'Welcome to DentistPortal - Account Activated!',
      html,
    });
  }

  async sendPasswordResetEmail(data: {
    firstName: string;
    email: string;
    resetUrl: string;
  }): Promise<boolean> {
    const html = `
      <h1>Password Reset Request</h1>
      <p>Hello ${data.firstName},</p>
      <p>We received a request to reset your password. Click the link below to create a new password:</p>
      <a href="${data.resetUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        Reset Password
      </a>
      <p>This link will expire in 1 hour for security reasons.</p>
      <p>If you didn't request this reset, please ignore this email.</p>
    `;

    return await this.sendEmail({
      to: data.email,
      subject: 'Reset Your DentistPortal Password',
      html,
    });
  }
}
