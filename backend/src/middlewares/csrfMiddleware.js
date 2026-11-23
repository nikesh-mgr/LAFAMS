import { randomBytes, timingSafeEqual } from "node:crypto";

import { AppError } from "../utils/appError.js";

/**
 * Persists the session before returning a CSRF token.
 */
const saveSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

/**
 * GET /api/auth/csrf
 *
 * Creates or returns the CSRF token for the current session.
 */
export const getCsrfToken = async (req, res, next) => {
  try {
    if (!req.session) {
      throw new AppError("Session is unavailable.", 500);
    }

    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString("hex");
      await saveSession(req);
    }

    return res.status(200).json({
      success: true,
      data: {
        csrfToken: req.session.csrfToken,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Protects state-changing requests against CSRF.
 *
 * Use on POST, PUT, PATCH and DELETE routes.
 * Safe methods are allowed without a CSRF token.
 */
export const requireCsrf = (req, res, next) => {
  try {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    const sessionToken = req.session?.csrfToken;
    const requestToken = req.get("X-CSRF-Token");

    if (
      typeof sessionToken !== "string" ||
      typeof requestToken !== "string" ||
      !/^[a-f0-9]{64}$/i.test(sessionToken) ||
      !/^[a-f0-9]{64}$/i.test(requestToken)
    ) {
      throw new AppError("Invalid or missing CSRF token.", 403);
    }

    const sessionBuffer = Buffer.from(sessionToken, "hex");
    const requestBuffer = Buffer.from(requestToken, "hex");

    if (!timingSafeEqual(sessionBuffer, requestBuffer)) {
      throw new AppError("Invalid or missing CSRF token.", 403);
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
