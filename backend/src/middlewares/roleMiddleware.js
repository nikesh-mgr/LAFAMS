import { AppError } from "../utils/appError.js";

/**
 * Restricts access to one or more account roles.
 *
 * Always use after requireAuth.
 *
 * Example:
 * router.get(
 *   "/staff",
 *   requireAuth,
 *   allowRoles("ADMIN"),
 *   controller,
 * );
 *
 * @param {...string} allowedRoles
 */
export const allowRoles = (...allowedRoles) => {
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some((role) => !["ADMIN", "STAFF", "CUSTOMER"].includes(role))
  ) {
    throw new TypeError("Valid allowed roles must be provided.");
  }

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication is required.", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          "You do not have permission to access this resource.",
          403,
        ),
      );
    }

    return next();
  };
};
