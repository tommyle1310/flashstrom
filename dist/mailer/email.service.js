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
let EmailService = class EmailService {
    constructor(transport, userService) {
        this.transport = transport;
        this.userService = userService;
    }
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async sendVerificationEmail(to) {
        const verificationCode = this.generateVerificationCode();
        const emailTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f7f7f7; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
        h1 { color: #333; text-align: center; }
        .content { font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 20px; }
        .verification-code { display: inline-block; background-color: #007bff; color: #ffffff; font-size: 36px; padding: 10px 20px; border-radius: 8px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; font-size: 14px; color: #777; }
        a { color: #007bff; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Welcome to Our Service!</h1>
        <div class="content">
          <p>Thank you for signing up. To complete your account creation, please verify your email by entering the code below:</p>
          <p class="verification-code">${verificationCode}</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>Thank you for choosing our service!</p>
          <p><a href="mailto:support@ourservice.com">Contact Support</a></p>
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