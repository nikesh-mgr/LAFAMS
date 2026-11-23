import {
  getStaffPermissions,
  updateStaffPermissions,
} from "../services/staffPermissionService.js";

// ============================================
// 1. GET STAFF PERMISSIONS
// ============================================

export const getStaffPermissionsController = async (req, res) => {
  const { staffId } = req.validated.params;

  const result = await getStaffPermissions(staffId);

  return res.status(200).json({
    success: true,
    message: "Staff permissions retrieved successfully.",
    data: result,
  });
};

// ============================================
// 2. UPDATE STAFF PERMISSIONS
// ============================================

export const updateStaffPermissionsController = async (req, res) => {
  const { staffId } = req.validated.params;
  const { permissions } = req.validated.body;

  const result = await updateStaffPermissions(staffId, permissions);

  return res.status(200).json({
    success: true,
    message: "Staff permissions updated successfully.",
    data: result,
  });
};
