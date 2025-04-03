"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const nodemailer = require("nodemailer");
const users_service_1 = require("../users/users.service");
const createResponse_1 = require("../utils/createResponse");
const image_urls_1 = require("../assets/image_urls");
let EmailService = class EmailService {
    constructor(transport, userService) {
        this.transport = transport;
        this.userService = userService;
    }
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async sendPasswordResetEmail(to, resetToken, firstName) {
        const resetLink = `https://yourdomain.com/reset-password?token=${resetToken}`;
        const logoFlashfood = image_urls_1.IMAGE_LINKS.LIGHT_FLASHFOOD_LOGO;
        const emailTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f9;
          color: #333;
        }
        .container {
          width: 100%;
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .header {
          padding: 20px;
          text-align: center;
          border-bottom: 1px solid #e0e0e0;
        }
        .header img {
          max-width: 100px;
          height: auto;
        }
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #333;
          margin: 10px 0;
        }
        .content {
          padding: 30px;
          text-align: center;
        }
        .content p {
          font-size: 16px;
          line-height: 1.6;
          color: #666;
          margin: 0 0 20px;
        }
        .button {
          display: inline-block;
          padding: 14px 30px;
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          background: linear-gradient(90deg, #4d9c39, #7dbf72);
          border-radius: 25px;
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 4px 10px rgba(77, 156, 57, 0.3);
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(77, 156, 57, 0.4);
        }
        .footer {
          padding: 20px;
          text-align: center;
          font-size: 14px;
          color: #999;
          background-color: #fafafa;
          border-top: 1px solid #e0e0e0;
        }
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoFlashfood}" alt="Logo" /> <!-- Replace with your logo URL -->
          <h1>Reset your password</h1>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>
          <p>We’re sending you this email because you requested a password reset. Click on this link to create a new password:</p>
          <a href="${resetLink}" class="button">Set a new password</a>
          <p style='margin-top: 2rem; color: "#aaa"'>If you didn’t request a password reset, you can ignore this email. Your password will not be changed.</p>
        </div>
        <div class="footer">
          <p>Flashfood team</p>
        </div>
      </div>
    </body>
    </html>
    `;
        try {
            await this.transport.sendMail({
                to,
                subject: 'Reset Your Password',
                html: emailTemplate
            });
            console.log('Password reset email sent successfully');
        }
        catch (error) {
            console.error('Error sending password reset email:', error);
            throw new Error('Failed to send password reset email');
        }
    }
    async sendVerificationEmail(to) {
        const verificationCode = this.generateVerificationCode();
        const logoFlashfood = image_urls_1.IMAGE_LINKS.LIGHT_FLASHFOOD_LOGO;
        const emailTemplate = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f4f4f9;
        color: #333;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        overflow: hidden;
      }
      .header {
        padding: 20px;
        text-align: center;
        border-bottom: 1px solid #e0e0e0;
      }
      .header img {
        max-width: 100px;
        height: auto;
      }
      .header h1 {
        font-size: 28px;
        font-weight: 700;
        color: #333;
        margin: 10px 0;
      }
      .content {
        padding: 30px;
        text-align: center;
      }
      .content p {
        font-size: 16px;
        line-height: 1.6;
        color: #666;
        margin: 0 0 20px;
      }
      .verification-code {
        display: inline-block;
        padding: 14px 30px;
        font-size: 24px;
        font-weight: 600;
        color: #ffffff;
        background: linear-gradient(90deg, #4d9c39, #7dbf72);
        border-radius: 25px;
        margin: 20px 0;
        box-shadow: 0 4px 10px rgba(77, 156, 57, 0.3);
      }
      .footer {
        padding: 20px;
        text-align: center;
        font-size: 14px;
        color: #999;
        background-color: #fafafa;
        border-top: 1px solid #e0e0e0;
      }
      .footer p {
        margin: 5px 0;
      }
      .footer a {
        color: #4d9c39;
        text-decoration: none;
      }
      .footer a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="${logoFlashfood}" alt="Logo" />
        <h1>Verify Your Email</h1>
      </div>
      <div class="content">
        <p>Hi there,</p>
        <p>Thank you for signing up! To complete your account creation, please verify your email by entering the code below:</p>
        <p class="verification-code">${verificationCode}</p>
        <p style="margin-top: 2rem; color: #aaa;">If you didn’t request this, you can ignore this email.</p>
      </div>
      <div class="footer">
        <p>Flashfood team</p>
        <p><a href="mailto:support@flashfood.com">Contact Support</a></p>
      </div>
    </div>
  </body>
  </html>
  `;
        try {
            await this.transport.sendMail({
                to,
                subject: 'Email Verification Code',
                html: emailTemplate
            });
            return verificationCode;
        }
        catch (error) {
            console.error('Error sending verification email:', error);
            throw new Error('Failed to send verification email');
        }
    }
    async sendEmail(to, subject, text, html) {
        try {
            await this.transport.sendMail({
                to,
                subject,
                text,
                html
            });
            console.log('Email sent successfully');
        }
        catch (error) {
            console.error('Error sending email:', error);
        }
    }
    async verifyEmail(email, code) {
        const user = await this.userService.findByCondition({ email });
        if (user && user.data.verification_code === +code) {
            await this.userService.update(user.data.id, {
                is_verified: true
            });
            return (0, createResponse_1.createResponse)('OK', null, 'Email verified successfully');
        }
        return { message: 'Invalid verification code' };
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)('MAIL_TRANSPORT')),
    __metadata("design:paramtypes", [typeof (_a = typeof nodemailer !== "undefined" && nodemailer.Transporter) === "function" ? _a : Object, users_service_1.UsersService])
], EmailService);
//# sourceMappingURL=email.service.js.map