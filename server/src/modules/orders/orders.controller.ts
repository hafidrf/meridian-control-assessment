import type { Request, Response } from "express";
import { ordersService } from "./orders.service.js";

export const ordersController = {
  list: (req: Request, res: Response) => {
    res.json(ordersService.list(req.query as never));
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
    res.json(ordersService.transition(req.params.id, req.body.status, req.body.note));
  },
  bulkStatus: (req: Request, res: Response) => {
    res.json(ordersService.bulkStatus(req.body.ids, req.body.status));
  },
  duplicate: (req: Request, res: Response) => {
    res.status(201).json(ordersService.duplicate(req.params.id));
  },
  allocate: (req: Request, res: Response) => {
    res.json(ordersService.allocateInventory(req.params.id));
  },
  exportCsv: (req: Request, res: Response) => {
    const csv = ordersService.exportCsv(req.query);
    res.type("text/csv").send(csv);
  },
};
