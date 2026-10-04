import type { Request, Response } from "express";
import { authService } from "./auth.service.js";

export const authController = {
  login: async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login(email, password);
    res.json(result);
  },

  refresh: async (req: Request, res: Response) => {
    const tokens = await authService.refresh(req.body.refreshToken);
    res.json(tokens);
  },

  logout: async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);
    res.status(204).end();
  },

  me: async (req: Request, res: Response) => {
    const user = await authService.me(req.user!.sub);
    res.json(user);
  },

  register: async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  },

  forgotPassword: async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    res.json({ ok: true });
  },

  resetPassword: async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ ok: true });
  },

  changePassword: async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword);
    res.json({ ok: true });
  },
};
