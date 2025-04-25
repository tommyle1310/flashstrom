import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { EmailService } from './mailer/email.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly emailService: EmailService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('send-test-email')
  async sendTestEmail() {
    try {
      console.log('Attempting to send email...');
      await this.emailService.sendEmail(
        'recipient@example.com', // Replace with the recipient email
        'Test Email', // Subject
        'Hello, this is a test email sent from NestJS!', // Plain text content
        `<p style="background-color: blue; font-size: 30px">Hello, this is a test email sent from <b>NestJS</b>!</p>` // HTML content
      );
      console.log('Email sent successfully');
      return 'Test email sent!';
    } catch (error: any) {
      console.error('Error sending email:', error);
      return 'Failed to send email';
    }
  }
}
