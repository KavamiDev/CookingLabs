import { BadRequestException } from "@nestjs/common";
import { isEmail } from "class-validator";

// A student read from the CSV file, once validated
export type ImportedStudent = {
  // Line in the file (the header is line 1): used in the error messages
  line: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  group: string;
};

// Columns of the template, in this order
export const CSV_COLUMNS = ["email", "first_name", "last_name", "group"];

// A class rarely has more students. It also keeps the request short (one e-mail per student).
export const MAX_STUDENTS = 200;

const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100; // same limit as the name of a group

// Returns the text of an uploaded .csv file, or throws a 400.
export function readCsvFile(file?: Express.Multer.File): string {
  if (!file) {
    throw new BadRequestException(["Le fichier est obligatoire"]);
  }
  if (!/\.csv$/i.test(file.originalname)) {
    throw new BadRequestException(["Le fichier doit être au format .csv"]);
  }
  let text: string;
  try {
    // fatal: throws instead of silently breaking the accents of a file that is not in UTF-8
    text = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
  } catch {
    throw new BadRequestException(["Le fichier doit être encodé en UTF-8"]);
  }
  if (text.includes("\0")) {
    throw new BadRequestException(["Le fichier n'est pas un fichier texte"]);
  }
  // Excel adds an invisible mark (BOM) at the start of the "CSV UTF-8" files
  return text.replace(/^﻿/, "");
}

// Reads the lines of the file and checks each one.
// Every error is collected with its line number, so the admin can fix the whole file at once.
// Throws a 400 whose message is the list of errors.
export function parseStudentsCsv(text: string): ImportedStudent[] {
  // \r?\n: files saved on Windows end their lines with \r\n
  const lines = text.split(/\r?\n/);
  const header = lines[0] ?? "";

  // Excel in French saves the CSV files with ";" instead of ","
  const separator = header.includes(";") ? ";" : ",";
  const columns = header.split(separator).map((column) => column.trim().toLowerCase());
  if (columns.join(",") !== CSV_COLUMNS.join(",")) {
    throw new BadRequestException([
      `Ligne 1 : les colonnes doivent être ${CSV_COLUMNS.join(", ")} (comme dans le modèle)`,
    ]);
  }

  const errors: string[] = [];
  const students: ImportedStudent[] = [];
  // Line of the first appearance of each e-mail, to find the duplicates
  const lineOfEmail = new Map<string, number>();

  lines.forEach((content, index) => {
    const line = index + 1;
    // Skips the header and the empty lines (often one at the end of the file)
    if (line === 1 || content.trim() === "") {
      return;
    }

    const cells = content.split(separator).map(cleanCell);
    if (cells.length !== CSV_COLUMNS.length) {
      errors.push(
        `Ligne ${line} : ${CSV_COLUMNS.length} colonnes attendues, ${cells.length} trouvée(s)`,
      );
      return;
    }
    const [rawEmail, firstName, lastName, group] = cells;
    // The same address with capitals is the same address
    const email = rawEmail.toLowerCase();

    if (!isEmail(email) || email.length > MAX_EMAIL_LENGTH) {
      errors.push(`Ligne ${line} : l'e-mail « ${rawEmail} » n'est pas valide`);
    } else if (lineOfEmail.has(email)) {
      errors.push(
        `Ligne ${line} : l'e-mail ${email} est déjà présent ligne ${lineOfEmail.get(email)}`,
      );
    } else {
      lineOfEmail.set(email, line);
    }

    if (firstName.length > MAX_NAME_LENGTH || lastName.length > MAX_NAME_LENGTH) {
      errors.push(`Ligne ${line} : le prénom et le nom font ${MAX_NAME_LENGTH} caractères maximum`);
    }
    if (group === "") {
      errors.push(`Ligne ${line} : le groupe est obligatoire`);
    } else if (group.length > MAX_NAME_LENGTH) {
      errors.push(`Ligne ${line} : le nom du groupe fait ${MAX_NAME_LENGTH} caractères maximum`);
    }

    students.push({
      line,
      email,
      // An empty cell means "not given"
      firstName: firstName || null,
      lastName: lastName || null,
      group,
    });
  });

  if (students.length === 0 && errors.length === 0) {
    errors.push("Le fichier ne contient aucun élève");
  }
  if (students.length > MAX_STUDENTS) {
    errors.push(
      `Le fichier contient ${students.length} élèves : ${MAX_STUDENTS} maximum par import`,
    );
  }
  if (errors.length > 0) {
    throw new BadRequestException(errors);
  }
  return students;
}

// Removes the spaces around a cell, and the quotes that some spreadsheets add ("Dupont")
function cleanCell(cell: string): string {
  return cell
    .trim()
    .replace(/^"(.*)"$/, "$1")
    .trim();
}
