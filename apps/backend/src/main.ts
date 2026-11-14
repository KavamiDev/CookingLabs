import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";
import { PrismaExceptionFilter } from "./prisma/prisma-exception.filter.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  // Lit l'en-tête Cookie de chaque requête et le range dans req.cookies (utilisé par AuthGuard).
  app.use(cookieParser());
  // Refuse les champs inconnus et applique les @Transform des DTO (ex. trim) avant le contrôleur.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter));
  // Documentation interactive de l'API, hors production : http://localhost:3001/api/docs
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder().setTitle("CookingLabs API").build();
    SwaggerModule.setup("api/docs", app, () => SwaggerModule.createDocument(app, config));
  }
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
