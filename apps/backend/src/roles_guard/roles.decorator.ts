import { Reflector } from "@nestjs/core";
import type { UserRole } from "../generated/prisma/client.js";

// @Roles(["admin"]) on a route: only these roles can call it (checked by RolesGuard)
export const Roles = Reflector.createDecorator<UserRole[]>();
