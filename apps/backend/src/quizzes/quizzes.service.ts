import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { QuizFile } from "./validate-quiz.js";

// What the admin sees: the questions in file order, with the right answers.
// Never send this to a student (the right answers are in it).
const QUIZ_WITH_ANSWERS = {
  id: true,
  title: true,
  passThreshold: true,
  questions: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      text: true,
      type: true,
      position: true,
      choices: { orderBy: { id: "asc" }, select: { id: true, text: true, isCorrect: true } },
    },
  },
} satisfies Prisma.QuizSelect;

// Business logic for quizzes: the controller only receives the request and calls this service
@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  // Saves the quiz of a lesson, in one transaction: if anything fails, nothing is saved.
  // An existing quiz is replaced, unless students already answered it (their grades would be lost).
  async importQuiz(courseId: number, lessonId: number, quiz: QuizFile) {
    return this.prisma.$transaction(async (tx) => {
      // FOR UPDATE locks the lesson: two imports at the same time cannot both create a quiz
      const lessons = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM lessons WHERE id = ${lessonId} AND "courseId" = ${courseId} FOR UPDATE`;
      if (lessons.length === 0) {
        throw new NotFoundException("Leçon introuvable");
      }

      const existingQuiz = await tx.quiz.findUnique({
        where: { lessonId },
        select: { id: true, _count: { select: { attempts: true } } },
      });
      if (existingQuiz && existingQuiz._count.attempts > 0) {
        throw new ConflictException(
          "Des élèves ont déjà répondu à ce QCM : il ne peut plus être remplacé",
        );
      }
      if (existingQuiz) {
        // Its questions and choices are deleted with it (onDelete: Cascade)
        await tx.quiz.delete({ where: { id: existingQuiz.id } });
      }

      return tx.quiz.create({
        data: {
          lessonId,
          title: quiz.title,
          passThreshold: quiz.passThreshold,
          questions: {
            create: quiz.questions.map((question, index) => ({
              text: question.text,
              type: question.type,
              position: index + 1,
              choices: { create: question.choices },
            })),
          },
        },
        select: QUIZ_WITH_ANSWERS,
      });
    });
  }

  // The quiz of a lesson with the right answers (admins only). 404 when the lesson has no quiz.
  async findWithAnswers(courseId: number, lessonId: number) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId, lesson: { courseId } },
      select: QUIZ_WITH_ANSWERS,
    });
    if (!quiz) {
      throw new NotFoundException("Cette leçon n'a pas de QCM");
    }
    return quiz;
  }
}
