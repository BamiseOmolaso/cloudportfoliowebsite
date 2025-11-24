// Type definitions for Prisma-related types

export interface PrismaError {
  code?: string;
  meta?: {
    target?: string[];
    cause?: string;
  };
  message?: string;
}

export interface JwtPayload {
  email: string;
  role: string;
  id: string;
  iat?: number;
  exp?: number;
}

