export interface AppErrorShape {
  code: string;
  status: number;
  message: string;
  details?: Record<string, string[]>;
}

export class AppError extends Error {
  code: string;
  status: number;
  details?: Record<string, string[]>;
  constructor({ code, status, message, details }: AppErrorShape) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
