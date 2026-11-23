import { Router } from "express";

import { PERMISSIONS } from "../config/permissionCatalog.js";

import { requireAuth } from "../middlewares/authMiddleware.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";
import { requirePermission } from "../middlewares/permissionMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";

import {
  uploadCustomerFiles,
  uploadCustomerProfilePhoto,
  parseCustomerMultipartFields,
} from "../middlewares/uploadMiddleware.js";

import {
  createCustomerSchema,
  listCustomersSchema,
  customerParamsSchema,
  customerAssetParamsSchema,
  updateCustomerSchema,
  updateCustomerStatusSchema,
} from "../validators/customerValidator.js";

import {
  createCustomerController,
  listCustomersController,
  getCustomerByIdController,
  updateCustomerController,
  updateCustomerStatusController,
} from "../controllers/customerController.js";

import { getCustomerAssetDownloadController } from "../controllers/customerAssetController.js";

const router = Router();

// ============================================
// AUTHENTICATION
// All Customer routes require an authenticated user.
// ============================================

router.use(requireAuth);

// ============================================
// 1. CREATE CUSTOMER PROFILE
// POST /api/customers
// ADMIN / STAFF WITH PERMISSION
// ============================================

router.post(
  "/",
  requirePermission(PERMISSIONS.CUSTOMER_CREATE_RECORD),
  uploadCustomerFiles,
  parseCustomerMultipartFields,
  validateRequest({
    body: createCustomerSchema,
  }),
  createCustomerController,
);

// ============================================
// 2. LIST CUSTOMER PROFILES
// GET /api/customers
// ADMIN / STAFF / CUSTOMER WITH PERMISSION
// ============================================

router.get(
  "/",
  requirePermission(PERMISSIONS.CUSTOMER_VIEW),
  validateRequest({
    query: listCustomersSchema,
  }),
  listCustomersController,
);

// ============================================
// 3. CUSTOMER ASSET DOWNLOAD
// ============================================

// Download Customer profile photograph.
router.get(
  "/:customerId/assets/:assetType",
  requirePermission(PERMISSIONS.CUSTOMER_VIEW),
  validateRequest({
    params: customerAssetParamsSchema,
  }),
  getCustomerAssetDownloadController,
);

// Download Customer document.
router.get(
  "/:customerId/assets/:assetType/:documentType",
  requirePermission(PERMISSIONS.CUSTOMER_VIEW),
  validateRequest({
    params: customerAssetParamsSchema,
  }),
  getCustomerAssetDownloadController,
);

// ============================================
// 4. GET CUSTOMER PROFILE
// GET /api/customers/:customerId
// ADMIN / STAFF / CUSTOMER WITH PERMISSION
// ============================================

router.get(
  "/:customerId",
  requirePermission(PERMISSIONS.CUSTOMER_VIEW),
  validateRequest({
    params: customerParamsSchema,
  }),
  getCustomerByIdController,
);

// ============================================
// 5. UPDATE CUSTOMER PROFILE
// PATCH /api/customers/:customerId
// ADMIN / STAFF WITH PERMISSION
// ============================================

router.patch(
  "/:customerId",
  requirePermission(PERMISSIONS.CUSTOMER_UPDATE_PROFILE),
  uploadCustomerProfilePhoto,
  validateRequest({
    params: customerParamsSchema,
    body: updateCustomerSchema,
  }),
  updateCustomerController,
);

// ============================================
// 6. ACTIVATE / DEACTIVATE CUSTOMER
// PATCH /api/customers/:customerId/status
// ADMIN ONLY
// ============================================

router.patch(
  "/:customerId/status",
  allowRoles("ADMIN"),
  validateRequest({
    params: customerParamsSchema,
    body: updateCustomerStatusSchema,
  }),
  updateCustomerStatusController,
);

export default router;
