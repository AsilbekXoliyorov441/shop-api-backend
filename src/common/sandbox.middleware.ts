import { NextFunction, Request, Response } from 'express';

const MAX_DELAY_MS = 10_000;

// ?_delay=ms va ?_fail=status: o'quvchilar loading va error holatlarini sinashi uchun
export function sandboxMiddleware(req: Request, res: Response, next: NextFunction) {
  const delay = Math.min(Math.max(Number(req.query._delay) || 0, 0), MAX_DELAY_MS);
  const fail = Number(req.query._fail);

  const run = () => {
    if (Number.isInteger(fail) && fail >= 400 && fail <= 599) {
      res.status(fail).json({
        statusCode: fail,
        code: 'SIMULATED_ERROR',
        message: 'Simulated error requested with ?_fail',
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  };

  if (delay > 0) setTimeout(run, delay);
  else run();
}
