import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();

const mealPlanInclude = {
  days: {
    include: {
      recipe: {
        include: {
          tags: { include: { person: true } },
          ingredients: { include: { ingredient: true } },
        },
      },
    },
    orderBy: { dayOfWeek: 'asc' as const },
  },
};

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.mealPlan.findMany({
      include: mealPlanInclude,
      orderBy: { startDate: 'desc' },
    });
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await prisma.mealPlan.findUnique({
      where: { id: Number(req.params.id) },
      include: mealPlanInclude,
    });
    if (!plan) { res.status(404).json({ error: 'Madplan ikke fundet' }); return; }
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

router.get('/by-week/:startDate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await prisma.mealPlan.findUnique({
      where: { startDate: new Date(req.params.startDate) },
      include: mealPlanInclude,
    });
    if (!plan) { res.status(404).json({ error: 'Madplan ikke fundet' }); return; }
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate } = req.body as { startDate?: string };
    if (!startDate) { res.status(400).json({ error: 'Startdato er påkrævet' }); return; }

    const plan = await prisma.mealPlan.create({
      data: { startDate: new Date(startDate) },
      include: mealPlanInclude,
    });
    res.status(201).json(plan);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'Madplan for denne uge findes allerede' }); return; }
    next(err);
  }
});

router.put('/:id/days/:dayOfWeek', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mealPlanId = Number(req.params.id);
    const dayOfWeek = Number(req.params.dayOfWeek);
    const { recipeId } = req.body as { recipeId?: number | null };

    const day = await prisma.mealPlanDay.upsert({
      where: { mealPlanId_dayOfWeek: { mealPlanId, dayOfWeek } },
      update: { recipeId: recipeId ?? null },
      create: { mealPlanId, dayOfWeek, recipeId: recipeId ?? null },
      include: {
        recipe: {
          include: {
            tags: { include: { person: true } },
            ingredients: { include: { ingredient: true } },
          },
        },
      },
    });
    res.json(day);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.mealPlan.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Auto-generate a week plan with leftover logic:
// If a person doesn't like day N's recipe, day N-1 must have a recipe they DO like.
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate } = req.body as { startDate?: string };
    if (!startDate) { res.status(400).json({ error: 'Startdato er påkrævet' }); return; }

    const recipes = await prisma.recipe.findMany({
      include: { tags: { include: { person: true } } },
    });

    if (recipes.length < 7) {
      res.status(422).json({ error: 'Du skal have mindst 7 opskrifter for at auto-generere en madplan' });
      return;
    }

    const people = await prisma.person.findMany();
    const peopleIds = people.map((p) => p.id);

    // Returns the set of person IDs who like the given recipe
    const likedBy = (recipeId: number): Set<number> => {
      const r = recipes.find((r) => r.id === recipeId);
      return new Set(r?.tags.map((t) => t.personId) ?? []);
    };

    const shuffled = [...recipes].sort(() => Math.random() - 0.5);
    const assigned: (number | null)[] = new Array(7).fill(null);
    const used = new Set<number>();

    //backtracking search: day 0 is unconstrained; for day > 0, everyone who dislikes today's recipe must have liked yesterday's. 
    const assign = (day: number): boolean => {
      //all days assigned
      if (day === 7) return true;

      for (const candidate of shuffled) {
        //skip already used recipes
        if (used.has(candidate.id)) continue;

        if (day > 0) {
          const prevId = assigned[day - 1];
          const prevLiked = prevId ? likedBy(prevId) : new Set<number>();
          const todayLiked = likedBy(candidate.id);
          //anyone who won't like today's candidate...
          const dislikers = peopleIds.filter((pid) => !todayLiked.has(pid));
          //...must have liked yesterday's recipe, or this candidate is invalid.
          if (!dislikers.every((pid) => prevLiked.has(pid))) continue;
        }

        //tentatively take this candidate and recurse into the next day.
        assigned[day] = candidate.id;
        used.add(candidate.id);

        if (assign(day + 1)) return true;

        //recursion failed further down the week - undo and try the next candidate.
        used.delete(candidate.id);
        assigned[day] = null;
      }

      return false;
    };

    if (!assign(0)) {
      res.status(422).json({
        error: 'Kunne ikke generere en gyldig madplan med de nuværende opskrifter og præferencer',
      });
      return;
    }

    //upsert mealplan
    const plan = await prisma.mealPlan.upsert({
      where: { startDate: new Date(startDate) },
      update: {},
      create: { startDate: new Date(startDate) },
    });

    await prisma.mealPlanDay.deleteMany({ where: { mealPlanId: plan.id } });

    await prisma.mealPlanDay.createMany({
      data: assigned.map((recipeId, dayOfWeek) => ({
        mealPlanId: plan.id,
        dayOfWeek,
        recipeId,
      })),
    });

    const result = await prisma.mealPlan.findUnique({
      where: { id: plan.id },
      include: mealPlanInclude,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
