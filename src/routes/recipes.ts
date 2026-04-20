import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();

const recipeInclude = {
  ingredients: { include: { ingredient: true } },
  tags: { include: { person: true } },
};

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { personId, difficulty, search } = req.query;

    const recipes = await prisma.recipe.findMany({
      where: {
        ...(difficulty ? { difficulty: Number(difficulty) } : {}),
        ...(personId ? { tags: { some: { personId: Number(personId) } } } : {}),
        ...(search ? { title: { contains: String(search) } } : {}),
      },
      include: recipeInclude,
      orderBy: { title: 'asc' },
    });

    res.json(recipes);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: Number(req.params.id) },
      include: recipeInclude,
    });
    if (!recipe) { res.status(404).json({ error: 'Opskrift ikke fundet' }); return; }
    res.json(recipe);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, instructions, servings, difficulty, imageUrl, ingredients, tagPersonIds } =
      req.body as {
        title?: string;
        instructions?: string;
        servings?: number;
        difficulty?: number;
        imageUrl?: string;
        ingredients?: { ingredientId: number; amount: string }[];
        tagPersonIds?: number[];
      };

    if (!title) { res.status(400).json({ error: 'Titel er påkrævet' }); return; }

    const recipe = await prisma.recipe.create({
      data: {
        title,
        instructions: instructions ?? '',
        servings: servings ?? 4,
        difficulty: difficulty ?? 3,
        imageUrl,
        ingredients: {
          create: (ingredients ?? []).map(({ ingredientId, amount }) => ({ ingredientId, amount })),
        },
        tags: {
          create: (tagPersonIds ?? []).map((personId) => ({ personId })),
        },
      },
      include: recipeInclude,
    });

    res.status(201).json(recipe);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { title, instructions, servings, difficulty, imageUrl, ingredients, tagPersonIds } =
      req.body as {
        title?: string;
        instructions?: string;
        servings?: number;
        difficulty?: number;
        imageUrl?: string;
        ingredients?: { ingredientId: number; amount: string }[];
        tagPersonIds?: number[];
      };

    await prisma.$transaction([
      prisma.recipeIngredient.deleteMany({ where: { recipeId: id } }),
      prisma.recipeTag.deleteMany({ where: { recipeId: id } }),
    ]);

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        title,
        instructions,
        servings,
        difficulty,
        imageUrl,
        ingredients: {
          create: (ingredients ?? []).map(({ ingredientId, amount }) => ({ ingredientId, amount })),
        },
        tags: {
          create: (tagPersonIds ?? []).map((personId) => ({ personId })),
        },
      },
      include: recipeInclude,
    });

    res.json(recipe);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const original = await prisma.recipe.findUnique({
      where: { id: Number(req.params.id) },
      include: recipeInclude,
    });
    if (!original) { res.status(404).json({ error: 'Opskrift ikke fundet' }); return; }

    const newTitle = (req.body as { title?: string }).title ?? `${original.title} (kopi)`;

    const copy = await prisma.recipe.create({
      data: {
        title: newTitle,
        instructions: original.instructions,
        servings: original.servings,
        difficulty: original.difficulty,
        imageUrl: original.imageUrl,
        ingredients: {
          create: original.ingredients.map(({ ingredientId, amount }) => ({ ingredientId, amount })),
        },
        tags: {
          create: original.tags.map(({ personId }) => ({ personId })),
        },
      },
      include: recipeInclude,
    });

    res.status(201).json(copy);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.recipe.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
