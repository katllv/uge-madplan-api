import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Ikke autoriseret' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: 'JWT_SECRET ikke konfigureret' });
    return;
  }

  try {
    jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: 'Ugyldigt eller udløbet token' });
  }
}
