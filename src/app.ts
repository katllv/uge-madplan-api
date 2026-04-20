import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { requireAuth } from './middleware/auth';
import authRouter from './routes/auth';
import peopleRouter from './routes/people';
import ingredientsRouter from './routes/ingredients';
import recipesRouter from './routes/recipes';
import mealPlansRouter from './routes/mealPlans';
import pantryRouter from './routes/pantry';
import shoppingListRouter from './routes/shoppingList';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use(requireAuth);
app.use('/api/people', peopleRouter);
app.use('/api/ingredients', ingredientsRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/meal-plans', mealPlansRouter);
app.use('/api/pantry', pantryRouter);
app.use('/api/shopping-list', shoppingListRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Intern serverfejl' });
});

export default app;
