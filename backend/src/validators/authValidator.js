import { z } from "zod";

const usernamePattern =
  /^(?:[a-z0-9._-]{3,30}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})$/;

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Username cannot exceed 254 characters.")
  .regex(usernamePattern, "Enter a valid username or email address.");

export const loginSchema = z
  .object({
    username: usernameSchema,

    password: z
      .string()
      .min(1, "Password is required.")
      .max(128, "Invalid username or password."),
  })
  .strict();
