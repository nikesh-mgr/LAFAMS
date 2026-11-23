import mongoose from "mongoose";

import { User } from "../models/userModel.js";
import { StaffProfile } from "../models/staffProfileModel.js";

import { PERMISSION_CATALOG } from "../config/permissionCatalog.js";

import { AppError } from "../utils/appError.js";

// ============================================
// Shared Helpers
// ============================================

// Only non-Admin permissions can be assigned to Staff.
const assignablePermissions = PERMISSION_CATALOG.filter(
  (item) => !item.adminOnly,
);

const assignablePermissionValues = new Set(
  assignablePermissions.map((item) => item.permission),
);

// Validate the Staff account ID.
const ensureValidStaffId = (staffId) => {
  if (!mongoose.isValidObjectId(staffId)) {
    throw new AppError("Invalid Staff account ID.", 400);
  }
};

// Ensure the account exists and has the STAFF role.
const ensureStaffAccountExists = async (staffId) => {
  ensureValidStaffId(staffId);

  const staffExists = await User.exists({
    _id: staffId,
    role: "STAFF",
  });

  if (!staffExists) {
    throw new AppError("Staff account not found.", 404);
  }
};

// Retrieve the Staff permission profile.
const findStaffProfile = async (staffId) => {
  const staffProfile = await StaffProfile.findOne({
    user: staffId,
  }).select("user permissions");

  if (!staffProfile) {
    throw new AppError("Staff permission profile was not found.", 404);
  }

  return staffProfile;
};

// Validate permissions at the service layer as well.
const validateStaffPermissions = (permissions) => {
  if (!Array.isArray(permissions)) {
    throw new AppError("Permissions must be an array.", 400);
  }

  const uniquePermissions = new Set(permissions);

  if (uniquePermissions.size !== permissions.length) {
    throw new AppError("Duplicate permissions are not allowed.", 400);
  }

  const invalidPermissions = permissions.filter(
    (permission) => !assignablePermissionValues.has(permission),
  );

  if (invalidPermissions.length > 0) {
    throw new AppError(
      "One or more permissions cannot be assigned to Staff.",
      400,
    );
  }
};

// ============================================
// 1. GET STAFF PERMISSIONS
// ============================================

export const getStaffPermissions = async (staffId) => {
  await ensureStaffAccountExists(staffId);

  const staffProfile = await findStaffProfile(staffId);

  return {
    staffId: staffProfile.user.toString(),
    assignedPermissions: staffProfile.permissions,
    availablePermissions: assignablePermissions,
  };
};

// ============================================
// 2. UPDATE STAFF PERMISSIONS
// ============================================

export const updateStaffPermissions = async (staffId, permissions) => {
  await ensureStaffAccountExists(staffId);

  validateStaffPermissions(permissions);

  const staffProfile = await findStaffProfile(staffId);

  // Replace the existing assignments with the Admin selection.
  staffProfile.permissions = [...permissions];

  await staffProfile.save();

  return {
    staffId: staffProfile.user.toString(),
    assignedPermissions: staffProfile.permissions,
  };
};
