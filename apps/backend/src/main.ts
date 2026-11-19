import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";
import { getTrustProxy } from "./config/env.js";
import { PrismaExceptionFilter } from "./prisma/prisma-exception.filter.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Use Security header with default arguments ( Xframe, Strict-transport, Content-Security etc...)
  app.useSecurityHeaders();

  // Number of proxies in front of the API, from TRUST_PROXY (0 in local development)
  app.set("trust proxy", getTrustProxy());

  // add 'api' before each routes
  app.setGlobalPrefix("api");

  // Read the header cookie of each request and puts in req.cookies
  app.use(cookieParser());

  // Refuse the unknown fields and apply them @Transform
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter));

  // Interactive documentation of api http://localhost:3001/api/docs
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder().setTitle("CookingLabs API").build();
    SwaggerModule.setup("api/docs", app, () => SwaggerModule.createDocument(app, config));
  }
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
