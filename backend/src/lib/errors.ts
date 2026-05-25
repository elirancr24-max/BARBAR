export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const BadRequest = (msg: string, details?: unknown) => new AppError(400, 'BAD_REQUEST', msg, details);
export const Unauthorized = (msg = 'אינך מחובר') => new AppError(401, 'UNAUTHORIZED', msg);
export const Forbidden = (msg = 'אין לך הרשאה') => new AppError(403, 'FORBIDDEN', msg);
export const NotFound = (msg = 'לא נמצא') => new AppError(404, 'NOT_FOUND', msg);
export const Conflict = (msg: string, details?: unknown) => new AppError(409, 'CONFLICT', msg, details);
export const TooMany = (msg = 'יותר מדי בקשות') => new AppError(429, 'TOO_MANY', msg);
