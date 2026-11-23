import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "../auth/auth.guard.js";
import { Roles } from "./roles.decorator.js";

// Use after AuthGuard: @UseGuards(AuthGuard, RolesGuard) then @Roles(["admin"])
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Roles placed on the route (method first, then controller)
    const roles = this.reflector.getAllAndOverride(Roles, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user; // set by AuthGuard

    // No user (AuthGuard forgotten on the route) = 403, not a 500 crash
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException("Accès refusé : droits insuffisants");
    }
    return true;
  }
}
