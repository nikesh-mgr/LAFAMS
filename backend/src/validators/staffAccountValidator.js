import { z } from "zod";

import { PERMISSION_CATALOG } from "../config/permissionCatalog.js";

// ============================================
// SHARED VALIDATION RULES
// ============================================

const usernamePattern =
  /^(?:[a-z0-9._-]{3,30}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})$/;

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Username cannot exceed 254 characters.")
  .regex(usernamePattern, "Enter a valid username or email address.");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Staff name must contain at least 2 characters.")
  .max(100, "Staff name cannot exceed 100 characters.");

const passwordSchema = z
  .string()
  .min(12, "Password must contain at least 12 characters.")
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Password cannot exceed 72 UTF-8 bytes.",
  );

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid Staff account ID.");

const staffDocumentTypesSchema = z
  .array(z.enum(["CITIZENSHIP_FRONT", "CITIZENSHIP_BACK"]))
  .max(2, "A maximum of two citizenship documents is allowed.")
  .refine(
    (documentTypes) => new Set(documentTypes).size === documentTypes.length,
    "Duplicate citizenship document types are not allowed.",
  )
  .refine(
    (documentTypes) =>
      documentTypes.length === 0 ||
      (documentTypes.includes("CITIZENSHIP_FRONT") &&
        documentTypes.includes("CITIZENSHIP_BACK")),
    "Both citizenship front and back document types are required.",
  );

// ============================================
// PERMISSION VALIDATION RULES
// ============================================

const assignableStaffPermissions = new Set(
  PERMISSION_CATALOG.filter((item) => !item.adminOnly).map(
    (item) => item.permission,
  ),
);

// ============================================
// 1. CREATE STAFF ACCOUNT
// ============================================

export const createStaffAccountSchema = z
  .object({
    name: nameSchema,
    username: usernameSchema,
    password: passwordSchema,
    documentTypes: staffDocumentTypesSchema.optional(),
  })
  .strict();

// ============================================
// 2. LIST STAFF ACCOUNTS
// ============================================

export const listStaffAccountsSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z
      .string()
      .trim()
      .max(100, "Search cannot exceed 100 characters.")
      .optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    sortBy: z
      .enum(["name", "username", "createdAt", "updatedAt"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

// ============================================
// 3. GET STAFF ACCOUNT BY ID
// ============================================

export const staffAccountParamsSchema = z
  .object({
    staffId: objectIdSchema,
  })
  .strict();

// ============================================
// 4. STAFF ASSET DOWNLOAD PARAMETERS
// ============================================

export const staffAssetParamsSchema = z
  .object({
    staffId: objectIdSchema,
    assetType: z.enum(["PROFILE_PHOTO", "DOCUMENT"]),
    documentType: z.enum(["CITIZENSHIP_FRONT", "CITIZENSHIP_BACK"]).optional(),
  })
  .strict()
  .refine(
    (data) =>
      (data.assetType === "DOCUMENT" && data.documentType !== undefined) ||
      (data.assetType === "PROFILE_PHOTO" && data.documentType === undefined),
    {
      message:
        "Document type is required for documents and must not be supplied for profile photos.",
      path: ["documentType"],
    },
  );

// ============================================
// 5. UPDATE STAFF ACCOUNT
// ============================================

export const updateStaffAccountSchema = z
  .object({
    name: nameSchema.optional(),
    username: usernameSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update.",
  );

// ============================================
// 6. ACTIVATE / DEACTIVATE STAFF ACCOUNT
// ============================================

export const updateStaffAccountStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
  .strict();

// ============================================
// 7. RESET STAFF PASSWORD
// ============================================

export const resetStaffPasswordSchema = z
  .object({
    password: passwordSchema,
  })
  .strict();

// ============================================
// 8. UPDATE STAFF PERMISSIONS
// ============================================

export const updateStaffPermissionsSchema = z
  .object({
    permissions: z
      .array(
        z
          .string()
          .refine(
            (permission) => assignableStaffPermissions.has(permission),
            "Invalid or Admin-only Staff permission.",
          ),
      )
      .max(
        assignableStaffPermissions.size,
        "Too many Staff permissions provided.",
      )
      .refine(
        (permissions) => new Set(permissions).size === permissions.length,
        "Duplicate Staff permissions are not allowed.",
      ),
  })
  .strict();
