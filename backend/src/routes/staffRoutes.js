import { Router } from "express";

import { requireAuth } from "../middlewares/authMiddleware.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";

import {
  uploadStaffFiles,
  parseAccountMultipartFields,
} from "../middlewares/uploadMiddleware.js";

import {
  createStaffAccountSchema,
  listStaffAccountsSchema,
  staffAccountParamsSchema,
  staffAssetParamsSchema,
  updateStaffAccountSchema,
  updateStaffAccountStatusSchema,
  resetStaffPasswordSchema,
  updateStaffPermissionsSchema,
} from "../validators/staffAccountValidator.js";

import {
  createStaffAccountController,
  listStaffAccountsController,
  getStaffAccountByIdController,
  updateStaffAccountController,
  updateStaffAccountStatusController,
  resetStaffPasswordController,
} from "../controllers/staffAccountController.js";

import { getStaffAssetDownloadController } from "../controllers/staffAssetController.js";

import {
  getStaffPermissionsController,
  updateStaffPermissionsController,
} from "../controllers/staffPermissionController.js";

const router = Router();

// All routes require an authenticated Admin.
router.use(requireAuth, allowRoles("ADMIN"));

// ============================================
// STAFF ACCOUNT MANAGEMENT
// ============================================

// Create Staff account.
router.post(
  "/",
  uploadStaffFiles,
  parseAccountMultipartFields,
  validateRequest({
    body: createStaffAccountSchema,
  }),
  createStaffAccountController,
);

// List Staff accounts.
router.get(
  "/",
  validateRequest({
    query: listStaffAccountsSchema,
  }),
  listStaffAccountsController,
);

// ============================================
// STAFF ASSET DOWNLOAD
// ============================================

// Download Staff profile photograph.
router.get(
  "/:staffId/assets/:assetType",
  validateRequest({
    params: staffAssetParamsSchema,
  }),
  getStaffAssetDownloadController,
);

// Download Staff citizenship document.
router.get(
  "/:staffId/assets/:assetType/:documentType",
  validateRequest({
    params: staffAssetParamsSchema,
  }),
  getStaffAssetDownloadController,
);

// ============================================
// STAFF ACCOUNT DETAILS
// ============================================

// Get one Staff account.
router.get(
  "/:staffId",
  validateRequest({
    params: staffAccountParamsSchema,
  }),
  getStaffAccountByIdController,
);

// Update Staff account details.
router.patch(
  "/:staffId",
  validateRequest({
    params: staffAccountParamsSchema,
    body: updateStaffAccountSchema,
  }),
  updateStaffAccountController,
);

// Activate or deactivate Staff account.
router.patch(
  "/:staffId/status",
  validateRequest({
    params: staffAccountParamsSchema,
    body: updateStaffAccountStatusSchema,
  }),
  updateStaffAccountStatusController,
);

// Reset Staff password.
router.patch(
  "/:staffId/password",
  validateRequest({
    params: staffAccountParamsSchema,
    body: resetStaffPasswordSchema,
  }),
  resetStaffPasswordController,
);

// ============================================
// STAFF PERMISSION MANAGEMENT
// ============================================

// View assigned and available Staff permissions.
router.get(
  "/:staffId/permissions",
  validateRequest({
    params: staffAccountParamsSchema,
  }),
  getStaffPermissionsController,
);

// Replace Staff permission assignments.
router.patch(
  "/:staffId/permissions",
  validateRequest({
    params: staffAccountParamsSchema,
    body: updateStaffPermissionsSchema,
  }),
  updateStaffPermissionsController,
);

export default router;
