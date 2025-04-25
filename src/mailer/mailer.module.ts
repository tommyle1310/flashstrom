import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import * as nodemailer from 'nodemailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }), // Explicitly specify .env file
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const user = configService.get<string>('GMAIL_USER');
        const pass = configService.get<string>('GMAIL_APP_PASSWORD');

        // Debug: Log credentials (remove in production)
        if (!user || !pass) {
          console.error('SMTP credentials missing:', { user, pass });
          throw new Error(
            'GMAIL_USER or GMAIL_APP_PASSWORD not found in environment variables'
          );
        }

        return {
          transport: nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // Use TLS
            auth: {
              user,
              pass
            }
          }),
          defaults: {
            from: '"Flashfood" <no-reply@flashfood.com>'
          },
          template: {
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true
            }
          }
        };
      },
      inject: [ConfigService]
    })
  ],
  providers: [
    {
      provide: 'MAIL_TRANSPORT',
      useFactory: async (configService: ConfigService) => {
        const user = configService.get<string>('GMAIL_USER');
        const pass = configService.get<string>('GMAIL_APP_PASSWORD');

        // Debug: Log credentials (remove in production)
        if (!user || !pass) {
          console.error('SMTP credentials missing:', { user, pass });
          throw new Error(
            'GMAIL_USER or GMAIL_APP_PASSWORD not found in environment variables'
          );
        }

        return nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user,
            pass
          }
        });
      },
      inject: [ConfigService]
    }
  ],
  exports: ['MAIL_TRANSPORT']
})
export class MailerCustomModule {}
