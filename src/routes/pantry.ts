import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.pantry.findMany({
      include: { ingredient: true },
      orderBy: { ingredient: { name: 'asc' } },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.put('/:ingredientId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredientId = Number(req.params.ingredientId);
    const { amount } = req.body as { amount?: string };
    if (!amount) { res.status(400).json({ error: 'Mængde er påkrævet' }); return; }

    const item = await prisma.pantry.upsert({
      where: { ingredientId },
      update: { amount },
      create: { ingredientId, amount },
      include: { ingredient: true },
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.pantry.deleteMany();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.delete('/:ingredientId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredientId = Number(req.params.ingredientId);
    await prisma.pantry.delete({ where: { ingredientId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
