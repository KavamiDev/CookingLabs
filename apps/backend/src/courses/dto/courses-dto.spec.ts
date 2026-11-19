// Create DTO test
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateCourseDto } from "./courses-dto.js";

describe("CreateCourseDto", () => {
  it("doit valider un DTO avec des données correctes", async () => {
    const plainObject = {
      title: "Introduction to TypeScript",
      description: "Learn the basics of TypeScript",
      category: "Programming",
    };

    const dto = plainToInstance(CreateCourseDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it("doit échouer la validation d'un DTO avec des données incorrectes", async () => {
    const plainObject = {
      title: "",
      description: 123,
      category: null,
    };

    const dto = plainToInstance(CreateCourseDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
