export interface AppErrorShape {
  code: string;
  status: number;
  message: string;
}

export class AppError extends Error {
  code: string;
  status: number;
  constructor({ code, status, message }: AppErrorShape) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
