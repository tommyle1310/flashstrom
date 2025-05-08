import React from 'react';
import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { UsersService } from '../users/users.service';
import { createResponse } from 'src/utils/createResponse';
import { IMAGE_LINKS } from 'src/assets/image_urls';
import { renderToStaticMarkup } from 'react-dom/server';
import PasswordResetEmail from './templates/PasswordResetEmail';
import VerificationEmail from './templates/VerificationEmail';

@Injectable()
export class EmailService {
  constructor(
    @Inject('MAIL_TRANSPORT')
    private readonly transport: nodemailer.Transporter,
    private readonly userService: UsersService
  ) {}

  // Generate a random 6-digit verification code
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    firstName: string
  ) {
    const resetLink = `http://localhost:1310/auth/reset-password?token=${resetToken}`;
    const successLink = `http://localhost:1310/auth/change-password-success`;
    const logoFlashfood = IMAGE_LINKS.LIGHT_FLASHFOOD_LOGO;

    // Render TSX to HTML string
    const emailTemplate = renderToStaticMarkup(
      <PasswordResetEmail
        logoUrl={logoFlashfood}
        firstName={firstName}
        resetLink={resetLink}
        successLink={successLink}
      />
    );

    // Add DOCTYPE to the rendered HTML
    const htmlWithDoctype = `<!DOCTYPE html>${emailTemplate}`;

    try {
      await this.transport.sendMail({
        to,
        subject: 'Reset Your Password',
        html: htmlWithDoctype
      });
      console.log('Password reset email sent successfully');
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendVerificationEmail(to: string) {
    const verificationCode = this.generateVerificationCode();
    const logoFlashfood = IMAGE_LINKS.LIGHT_FLASHFOOD_LOGO;

    // Render TSX to HTML string
    const emailTemplate = renderToStaticMarkup(
      <VerificationEmail
        logoUrl={logoFlashfood}
        verificationCode={verificationCode}
      />
    );

    // Add DOCTYPE to the rendered HTML
    const htmlWithDoctype = `<!DOCTYPE html>${emailTemplate}`;

    try {
      await this.transport.sendMail({
        to,
        subject: 'Email Verification Code',
        html: htmlWithDoctype
      });
      return verificationCode;
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    try {
      await this.transport.sendMail({
        to,
        subject,
        text,
        html
      });
      console.log('Email sent successfully');
    } catch (error: any) {
      console.error('Error sending email:', error);
    }
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.userService.findByCondition({ email });

    if (user && user.data.verification_code === +code) {
      await this.userService.update(user.data.id, {
        is_verified: true
      });
      return createResponse('OK', null, 'Email verified successfully');
    }
    return { message: 'Invalid verification code' };
  }
}
