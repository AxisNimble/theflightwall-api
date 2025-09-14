import type { Context } from "hono";

export type AppContext = Context<{ Bindings: Env }>;
export type HandleArgs = [AppContext];

// Shared API envelope types
export type ApiSuccess<T> = {
  success: true;
  result: T;
};

export type ApiError = {
  success: false;
  errors: { code: number; message: string }[];
};
