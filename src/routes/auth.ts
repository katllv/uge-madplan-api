import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', (req: Request, res: Response): void => {
  const { password } = req.body as { password?: string };

  if (!password) {
    res.status(400).json({ error: 'Adgangskode er påkrævet' });
    return;
  }

  const appPassword = process.env.APP_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!appPassword || !jwtSecret) {
    res.status(500).json({ error: 'Server ikke korrekt konfigureret' });
    return;
  }

  if (password !== appPassword) {
    res.status(401).json({ error: 'Forkert adgangskode' });
    return;
  }

  const token = jwt.sign({ auth: true }, jwtSecret, { expiresIn: '30d' });
  res.json({ token });
});

export default router;
