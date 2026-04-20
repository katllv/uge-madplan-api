import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const people = await prisma.person.findMany({ orderBy: { name: 'asc' } });
    res.json(people);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const person = await prisma.person.findUnique({ where: { id: Number(req.params.id) } });
    if (!person) { res.status(404).json({ error: 'Person ikke fundet' }); return; }
    res.json(person);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, color } = req.body as { name?: string; color?: string };
    if (!name) { res.status(400).json({ error: 'Navn er påkrævet' }); return; }
    const person = await prisma.person.create({ data: { name, color } });
    res.status(201).json(person);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, color } = req.body as { name?: string; color?: string };
    const person = await prisma.person.update({
      where: { id: Number(req.params.id) },
      data: { name, color },
    });
    res.json(person);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.person.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
