import { StaffProfile } from "../models/staffProfileModel.js";

import { PERMISSIONS } from "../config/permissionCatalog.js";

import { AppError } from "../utils/appError.js";

/**
 * Checks whether the authenticated account has all
 * requested permissions.
 *
 * Must be used after requireAuth.
 *
 * Authorization rules:
 * - ADMIN: Full authorization access.
 * - STAFF: Permissions loaded from MongoDB.
 * - CUSTOMER: Restricted to customer:view.
 *
 * Resource ownership must still be checked separately.
 *
 * @param {...string} requiredPermissions
 */
export const requirePermission = (...requiredPermissions) => {
  const validPermissions = Object.values(PERMISSIONS);

  // Validate permission arguments when defining the route.
  if (
    requiredPermissions.length === 0 ||
    requiredPermissions.some(
      (permission) => !validPermissions.includes(permission),
    )
  ) {
    throw new TypeError("Valid permissions must be provided.");
  }

  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("Authentication is required.", 401);
      }

      // Admin authorization is based on the verified database role.
      if (req.user.role === "ADMIN") {
        return next();
      }

      // Customers can only access routes requiring customer:view.
      if (req.user.role === "CUSTOMER") {
        const customerHasPermission = requiredPermissions.every(
          (permission) => permission === PERMISSIONS.CUSTOMER_VIEW,
        );

        if (!customerHasPermission) {
          throw new AppError(
            "You do not have permission to perform this operation.",
            403,
          );
        }

        return next();
      }

      if (req.user.role !== "STAFF") {
        throw new AppError("Access denied.", 403);
      }

      // Always retrieve current Staff permissions from MongoDB.
      const staffProfile = await StaffProfile.findOne({
        user: req.user.id,
      }).select("permissions");

      if (!staffProfile) {
        throw new AppError("Staff permission profile was not found.", 403);
      }

      const assignedPermissions = new Set(staffProfile.permissions);

      const hasAllPermissions = requiredPermissions.every((permission) =>
        assignedPermissions.has(permission),
      );

      if (!hasAllPermissions) {
        throw new AppError(
          "You do not have permission to perform this operation.",
          403,
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
