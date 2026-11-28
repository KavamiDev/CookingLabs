import { BadRequestException } from "@nestjs/common";
import { readQuizFile } from "./read-quiz-file.js";

function fakeFile(originalname: string, buffer: Buffer) {
  return { originalname, buffer } as Express.Multer.File;
}

describe("readQuizFile", () => {
  it.each(["qcm.json", "QCM.JSON"])("reads %s", (name) => {
    expect(readQuizFile(fakeFile(name, Buffer.from('{"title":"Pâte"}')))).toEqual({
      title: "Pâte",
    });
  });

  it("reads a file that starts with a BOM (saved by some Windows editors)", () => {
    const withBom = Buffer.from('﻿{"title":"Pâte"}');
    expect(readQuizFile(fakeFile("qcm.json", withBom))).toEqual({ title: "Pâte" });
  });

  it("rejects a missing file", () => {
    expect(() => readQuizFile(undefined)).toThrow(BadRequestException);
  });

  it.each(["qcm.txt", "qcm.json.exe", "json"])("rejects the file name %s", (name) => {
    expect(() => readQuizFile(fakeFile(name, Buffer.from("{}")))).toThrow(".json");
  });

  it("rejects a file that is not in UTF-8", () => {
    const latin1 = Buffer.from('{"title":"Pâte"}', "latin1");
    expect(() => readQuizFile(fakeFile("a.json", latin1))).toThrow("UTF-8");
  });

  it.each(["", "{", "{'title': 'x'}", "<p>x</p>"])("rejects the invalid JSON %j", (text) => {
    expect(() => readQuizFile(fakeFile("a.json", Buffer.from(text)))).toThrow("JSON valide");
  });
});
