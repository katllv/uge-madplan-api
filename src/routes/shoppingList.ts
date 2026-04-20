import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/shopping-list/:mealPlanId
// Aggregates all ingredients for the week, subtracts pantry quantities, returns grouped list.
router.get('/:mealPlanId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mealPlanId = Number(req.params.mealPlanId);

    const plan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: {
        days: {
          include: {
            recipe: {
              include: { ingredients: { include: { ingredient: true } } },
            },
          },
        },
      },
    });

    if (!plan) { res.status(404).json({ error: 'Madplan ikke fundet' }); return; }

    const pantry = await prisma.pantry.findMany({ include: { ingredient: true } });
    const pantryMap = new Map(pantry.map((p) => [p.ingredientId, p.amount]));

    // Aggregate ingredient amounts across all days
    const totals = new Map<number, { ingredient: { id: number; name: string; unit: string }; totalAmount: string; pantryAmount: string | null }>();

    for (const day of plan.days) {
      if (!day.recipe) continue;
      for (const ri of day.recipe.ingredients) {
        const existing = totals.get(ri.ingredientId);
        if (existing) {
          // Simple string concat — amounts may be "2 stk", "400 g", etc.
          // We store them as-is; the frontend can group/render them.
          existing.totalAmount += ` + ${ri.amount}`;
        } else {
          totals.set(ri.ingredientId, {
            ingredient: ri.ingredient,
            totalAmount: ri.amount,
            pantryAmount: pantryMap.get(ri.ingredientId) ?? null,
          });
        }
      }
    }

    const items = Array.from(totals.values()).sort((a, b) =>
      a.ingredient.name.localeCompare(b.ingredient.name, 'da'),
    );

    res.json({ mealPlanId, items });
  } catch (err) {
    next(err);
  }
});

export default router;
