import type { Request, Response } from "express";
import { ordersService } from "./orders.service.js";

export const ordersController = {
  list: (req: Request, res: Response) => {
    res.json(ordersService.list(req.query as never, req.user));
  },
  get: (req: Request, res: Response) => {
    res.json(ordersService.getById(req.params.id));
  },
  create: (req: Request, res: Response) => {
    const created = ordersService.create(req.body, req.user!.sub);
    res.status(201).json(created);
  },
  update: (req: Request, res: Response) => {
    res.json(ordersService.update(req.params.id, req.body));
  },
  remove: (req: Request, res: Response) => {
    ordersService.remove(req.params.id);
    res.status(204).end();
  },
  transition: (req: Request, res: Response) => {
    res.json(ordersService.transition(req.params.id, req.body.status, req.body.note, req.user!.sub));
  },
  bulkStatus: (req: Request, res: Response) => {
    res.json(ordersService.bulkStatus(req.body.ids, req.body.status, req.user!.sub));
  },
  duplicate: (req: Request, res: Response) => {
    res.status(201).json(ordersService.duplicate(req.params.id, req.user!.sub));
  },
  allocate: (req: Request, res: Response) => {
    res.json(ordersService.allocateInventory(req.params.id, req.user!.sub));
  },
  exportCsv: (req: Request, res: Response) => {
    const csv = ordersService.exportCsv(req.query);
    res.type("text/csv").setHeader("Content-Disposition", 'attachment; filename="orders.csv"').send(csv);
  },
};
