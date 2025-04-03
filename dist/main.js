"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const dotenv = require("dotenv");
const createResponse_1 = require("./utils/createResponse");
const path_1 = require("path");
dotenv.config();
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useLogger(['debug', 'error', 'log', 'verbose', 'warn']);
    app.enableCors({
        origin: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        allowedHeaders: 'Content-Type, Accept, Authorization, ngrok-skip-browser-warning, X-Content-Type-Options',
        credentials: true
    });
    app.use((req, res, next) => {
        if (!req.path.startsWith('/auth/reset-password')) {
            res.setHeader('ngrok-skip-browser-warning', 'true');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }
        next();
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
    }));
    app.useGlobalFilters(new createResponse_1.HttpExceptionFilter());
    const viewsPath = (0, path_1.resolve)(__dirname, '..', 'src', 'views');
    console.log('Views directory:', viewsPath);
    app.setBaseViewsDir(viewsPath);
    app.setViewEngine('hbs');
    await app.listen(process.env.PORT ?? 1310);
    console.log('🚀 Server running on port', process.env.PORT ?? 1310);
}
bootstrap();
//# sourceMappingURL=main.js.map