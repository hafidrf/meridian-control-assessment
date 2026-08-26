import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import { authController } from "./auth.controller.js";
import { forgotPasswordSchema, loginSchema, refreshSchema, registerSchema, resetPasswordSchema } from "./auth.validators.js";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), asyncHandler(authController.login));
authRouter.post("/refresh", validate(refreshSchema), asyncHandler(authController.refresh));
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
authRouter.post("/register", validate(registerSchema), asyncHandler(authController.register));
authRouter.post("/forgot-password", validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
authRouter.post("/reset-password", validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
