import { BadRequestException } from "@nestjs/common";
import { MAX_STUDENTS, parseStudentsCsv, readCsvFile } from "./read-users-csv.js";

const HEADER = "email,first_name,last_name,group";

// The list of errors of the 400 thrown by `run`
function errorsOf(run: () => unknown): string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof BadRequestException) {
      return (error.getResponse() as { message: string[] }).message;
    }
    throw error;
  }
  throw new Error("No error thrown");
}

function fakeFile(name: string, content: string | Buffer) {
  return { originalname: name, buffer: Buffer.from(content) } as Express.Multer.File;
}

describe("readCsvFile", () => {
  it("returns the text, without the BOM added by Excel", () => {
    expect(readCsvFile(fakeFile("eleves.csv", `﻿${HEADER}`))).toBe(HEADER);
  });

  it("refuses a missing file, another extension, another encoding and a binary file", () => {
    expect(errorsOf(() => readCsvFile(undefined))).toEqual(["Le fichier est obligatoire"]);
    expect(errorsOf(() => readCsvFile(fakeFile("eleves.xlsx", HEADER)))).toEqual([
      "Le fichier doit être au format .csv",
    ]);
    // "é" in Latin-1 (one byte 0xE9): not valid UTF-8
    expect(errorsOf(() => readCsvFile(fakeFile("eleves.csv", Buffer.from([0x65, 0xe9]))))).toEqual([
      "Le fichier doit être encodé en UTF-8",
    ]);
    expect(errorsOf(() => readCsvFile(fakeFile("eleves.csv", "a\0b")))).toEqual([
      "Le fichier n'est pas un fichier texte",
    ]);
  });
});

describe("parseStudentsCsv", () => {
  it("reads each student with its line number", () => {
    const csv = `${HEADER}\nmarie@ecole.fr,Marie,Curie,CAP 1\nleo@ecole.fr,,,CAP 2\n`;
    expect(parseStudentsCsv(csv)).toEqual([
      { line: 2, email: "marie@ecole.fr", firstName: "Marie", lastName: "Curie", group: "CAP 1" },
      { line: 3, email: "leo@ecole.fr", firstName: null, lastName: null, group: "CAP 2" },
    ]);
  });

  it("accepts the files of Excel in French: separator ;, Windows lines, quotes, capitals", () => {
    const csv = `EMAIL;First_Name;last_name;group\r\n "Marie@Ecole.fr" ; "Marie" ;Curie; CAP 1 \r\n`;
    expect(parseStudentsCsv(csv)).toEqual([
      { line: 2, email: "marie@ecole.fr", firstName: "Marie", lastName: "Curie", group: "CAP 1" },
    ]);
  });

  it("refuses a file whose columns are not those of the template", () => {
    expect(errorsOf(() => parseStudentsCsv("mail,nom\na@b.fr,A"))).toEqual([
      "Ligne 1 : les colonnes doivent être email, first_name, last_name, group (comme dans le modèle)",
    ]);
  });

  it("collects every error with its line number", () => {
    const csv = [
      HEADER,
      "ok@ecole.fr,Ok,Ok,CAP",
      "pas-un-email,A,B,CAP",
      "OK@ecole.fr,Doublon,Doublon,CAP",
      "sans-groupe@ecole.fr,A,B,",
      "trop,de,colonnes,ici,encore",
      `long@ecole.fr,${"a".repeat(101)},B,CAP`,
    ].join("\n");
    expect(errorsOf(() => parseStudentsCsv(csv))).toEqual([
      "Ligne 3 : l'e-mail « pas-un-email » n'est pas valide",
      "Ligne 4 : l'e-mail ok@ecole.fr est déjà présent ligne 2",
      "Ligne 5 : le groupe est obligatoire",
      "Ligne 6 : 4 colonnes attendues, 5 trouvée(s)",
      "Ligne 7 : le prénom et le nom font 100 caractères maximum",
    ]);
  });

  it("refuses a file without students", () => {
    expect(errorsOf(() => parseStudentsCsv(`${HEADER}\n\n`))).toEqual([
      "Le fichier ne contient aucun élève",
    ]);
  });

  it(`refuses more than ${MAX_STUDENTS} students`, () => {
    const lines = Array.from({ length: MAX_STUDENTS + 1 }, (_, i) => `e${i}@ecole.fr,,,CAP`);
    expect(errorsOf(() => parseStudentsCsv([HEADER, ...lines].join("\n")))).toEqual([
      `Le fichier contient ${MAX_STUDENTS + 1} élèves : ${MAX_STUDENTS} maximum par import`,
    ]);
  });
});
