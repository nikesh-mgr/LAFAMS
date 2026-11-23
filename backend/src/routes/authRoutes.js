import { Router } from "express";

import { login, logout } from "../controllers/authController.js";

import { validateRequest } from "../middlewares/validateRequest.js";
import { getCsrfToken } from "../middlewares/csrfMiddleware.js";

import { loginSchema } from "../validators/authValidator.js";

const authRoutes = Router();

// GET /api/auth/csrf
// Obtain a CSRF token before login or other protected actions.
authRoutes.get("/csrf", getCsrfToken);

// POST /api/auth/login
authRoutes.post(
  "/login",
  validateRequest({
    body: loginSchema,
  }),
  login,
);

// POST /api/auth/logout
authRoutes.post("/logout", logout);

export default authRoutes;
