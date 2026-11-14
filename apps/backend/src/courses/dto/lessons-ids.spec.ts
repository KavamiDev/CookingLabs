// Test for lessons-ids

import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LessonsIdsDto, ReorderLessonsDto } from "./lessons-ids.js";

describe("LessonsIdsDto", () => {
  it("doit valider une leçon avec un id et une position", async () => {
    const plainObject = {
      id: 1,
      position: 1,
    };

    const dto = plainToInstance(LessonsIdsDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it("doit échouer si la leçon n'a pas d'id", async () => {
    const plainObject = {
      position: 1,
    };

    const dto = plainToInstance(LessonsIdsDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it("doit échouer si la position n'est pas un nombre", async () => {
    const plainObject = {
      id: 1,
      position: "abc",
    };

    const dto = plainToInstance(LessonsIdsDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("ReorderLessonsDto", () => {
  it("doit valider une liste de leçons correctes", async () => {
    const plainObject = {
      lessons: [
        { id: 1, position: 2 },
        { id: 2, position: 1 },
      ],
    };

    const dto = plainToInstance(ReorderLessonsDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it("doit échouer si une leçon de la liste est incorrecte", async () => {
    const plainObject = {
      lessons: [
        { id: 1, position: 2 },
        { id: "abc", position: 1 },
      ],
    };

    const dto = plainToInstance(ReorderLessonsDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it("doit échouer si lessons n'est pas un tableau", async () => {
    const plainObject = {
      lessons: "pas un tableau",
    };

    const dto = plainToInstance(ReorderLessonsDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
