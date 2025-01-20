import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import * as nodemailer from 'nodemailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: nodemailer.createTransport({
          host: 'smtp.mailtrap.io',
          port: 2525,
          auth: {
            user: '389c1523b80572', // Your Mailtrap username
            pass: '9685cd52ea218d', // Your Mailtrap password
          },
        }),
        defaults: {
          from: '"NestJS" <noreply@nestjs.com>',
        },
        template: {
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [
    {
      provide: 'MAIL_TRANSPORT',
      useFactory: () => {
        return nodemailer.createTransport({
          host: 'smtp.mailtrap.io',
          port: 2525,
          auth: {
            user: '389c1523b80572', // Your Mailtrap username
            pass: '9685cd52ea218d', // Your Mailtrap password
          },
        });
      },
    },
  ],
  exports: ['MAIL_TRANSPORT'], // Export the provider so it can be used in other modules
})
export class MailerCustomModule {}
