"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailerCustomModule = void 0;
const common_1 = require("@nestjs/common");
const mailer_1 = require("@nestjs-modules/mailer");
const nodemailer = require("nodemailer");
const handlebars_adapter_1 = require("@nestjs-modules/mailer/dist/adapters/handlebars.adapter");
let MailerCustomModule = class MailerCustomModule {
};
exports.MailerCustomModule = MailerCustomModule;
exports.MailerCustomModule = MailerCustomModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mailer_1.MailerModule.forRootAsync({
                useFactory: () => ({
                    transport: nodemailer.createTransport({
                        host: 'smtp.mailtrap.io',
                        port: 2525,
                        auth: {
                            user: '389c1523b80572',
                            pass: '9685cd52ea218d'
                        }
                    }),
                    defaults: {
                        from: '"NestJS" <noreply@nestjs.com>'
                    },
                    template: {
                        adapter: new handlebars_adapter_1.HandlebarsAdapter(),
                        options: {
                            strict: true
                        }
                    }
                })
            })
        ],
        providers: [
            {
                provide: 'MAIL_TRANSPORT',
                useFactory: () => {
                    return nodemailer.createTransport({
                        host: 'smtp.mailtrap.io',
                        port: 2525,
                        auth: {
                            user: '389c1523b80572',
                            pass: '9685cd52ea218d'
                        }
                    });
                }
            }
        ],
        exports: ['MAIL_TRANSPORT']
    })
], MailerCustomModule);
//# sourceMappingURL=mailer.module.js.map