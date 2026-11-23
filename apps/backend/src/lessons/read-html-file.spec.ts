import { BadRequestException } from "@nestjs/common";
import { readHtmlFile } from "./read-html-file.js";

function fakeFile(originalname: string, buffer: Buffer) {
  return { originalname, buffer } as Express.Multer.File;
}

describe("readHtmlFile", () => {
  it.each(["lecon.html", "lecon.htm", "LECON.HTML"])("reads %s", (name) => {
    expect(readHtmlFile(fakeFile(name, Buffer.from("<p>Pâte</p>")))).toBe("<p>Pâte</p>");
  });

  it("rejects a missing file", () => {
    expect(() => readHtmlFile(undefined)).toThrow(BadRequestException);
  });

  it.each(["lecon.pdf", "lecon.html.exe", "html"])("rejects the file name %s", (name) => {
    expect(() => readHtmlFile(fakeFile(name, Buffer.from("<p>x</p>")))).toThrow(".html");
  });

  it("rejects a file that is not in UTF-8", () => {
    const latin1 = Buffer.from("<p>Pâte</p>", "latin1");
    expect(() => readHtmlFile(fakeFile("a.html", latin1))).toThrow("UTF-8");
  });

  it("rejects a binary file renamed to .html", () => {
    expect(() => readHtmlFile(fakeFile("a.html", Buffer.from("a\0b")))).toThrow("fichier texte");
  });
});
