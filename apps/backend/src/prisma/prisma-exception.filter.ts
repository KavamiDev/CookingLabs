import {
  ArgumentsHost,
  Catch,
  ConflictException,
  HttpException,
  NotFoundException,
} from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { Prisma } from "../generated/prisma/client.js";

/**
 * Traduit les erreurs Prisma connues en réponses HTTP claires, au lieu d'un 500.
 * Codes Prisma : https://www.prisma.io/docs/orm/reference/error-reference
 */
const HTTP_ERRORS: Record<string, () => HttpException> = {
  P2025: () => new NotFoundException(), // l'enregistrement demandé n'existe pas
  P2002: () => new ConflictException("Cette valeur existe déjà"), // contrainte unique (ex. e-mail)
  P2003: () => new ConflictException("Cet élément est encore utilisé ailleurs"), // clé étrangère
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const toHttpError = HTTP_ERRORS[exception.code];
    super.catch(toHttpError ? toHttpError() : exception, host);
  }
}
