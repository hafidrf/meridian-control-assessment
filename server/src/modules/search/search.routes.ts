import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { notImplemented } from "../../utils/errors.js";

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get("/", (_req, res) => {
  notImplemented("search.global");
  res.status(501).end();
});
