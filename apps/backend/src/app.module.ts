import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module.js";
import { CoursesModule } from "./courses/courses.module.js";
import { GroupsModule } from "./groups/groups.module.js";
import { HealthController } from "./health/health.controller.js";
import { InvitationsModule } from "./invitations/invitations.module.js";
import { LessonsModule } from "./lessons/lessons.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { QuizzesModule } from "./quizzes/quizzes.module.js";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    // Limite par défaut : 100 requêtes par minute et par IP. La connexion aura sa propre limite (@Throttle).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    CoursesModule,
    LessonsModule,
    GroupsModule,
    QuizzesModule,
    InvitationsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
