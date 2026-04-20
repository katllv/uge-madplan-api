import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredients = await prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
    res.json(ingredients);
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q ?? '');
    const ingredients = await prisma.ingredient.findMany({
      where: { name: { contains: q } },
      orderBy: { name: 'asc' },
      take: 20,
    });
    res.json(ingredients);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredient = await prisma.ingredient.findUnique({ where: { id: Number(req.params.id) } });
    if (!ingredient) { res.status(404).json({ error: 'Ingrediens ikke fundet' }); return; }
    res.json(ingredient);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, unit = '' } = req.body as { name?: string; unit?: string };
    if (!name) { res.status(400).json({ error: 'Navn er påkrævet' }); return; }
    const ingredient = await prisma.ingredient.create({ data: { name, unit } });
    res.status(201).json(ingredient);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'Ingrediens med dette navn findes allerede' }); return; }
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, unit } = req.body as { name?: string; unit?: string };
    const ingredient = await prisma.ingredient.update({
      where: { id: Number(req.params.id) },
      data: { name, unit },
    });
    res.json(ingredient);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'Ingrediens med dette navn findes allerede' }); return; }
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.ingredient.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
