import { Router } from "express";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { authController } from "./auth.controller.js";
import { forgotPasswordSchema, loginSchema, refreshSchema, registerSchema, resetPasswordSchema } from "./auth.validators.js";

export const authRouter = Router();

authRouter.post("/login", rateLimit, validate(loginSchema), asyncHandler(authController.login));
authRouter.post("/refresh", validate(refreshSchema), asyncHandler(authController.refresh));
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
// Registration is invite/admin-only: there is no public self-signup route.
authRouter.post("/register", requireAuth, requireRoles("admin"), validate(registerSchema), asyncHandler(authController.register));
authRouter.post("/forgot-password", rateLimit, validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
authRouter.post("/reset-password", validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
authRouter.post("/change-password", requireAuth, asyncHandler(authController.changePassword));
