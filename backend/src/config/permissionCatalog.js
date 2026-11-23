/**
 * Central permission definitions for LAFAms.
 *
 * Keep permission names consistent across:
 * routes, middleware, controllers, and services.
 */
export const PERMISSIONS = Object.freeze({
  // ==========================================
  // Customer Management
  // ==========================================

  CUSTOMER_VIEW: "customer:view",
  CUSTOMER_CREATE_RECORD: "customer:create-record",
  CUSTOMER_UPDATE_PROFILE: "customer:update-profile",

  // ==========================================
  // Customer Account Management
  // ==========================================

  CUSTOMER_REQUEST_ACTIVATION: "customer:request-activation",
  CUSTOMER_REQUEST_DEACTIVATION: "customer:request-deactivation",
  CUSTOMER_REQUEST_PASSWORD_RESET: "customer:request-password-reset",

  // Admin-only direct account operations
  CUSTOMER_ACTIVATE: "customer:activate",
  CUSTOMER_DEACTIVATE: "customer:deactivate",
  CUSTOMER_RESET_PASSWORD: "customer:reset-password",

  // ==========================================
  // Staff and User Management
  // ==========================================

  STAFF_VIEW: "staff:view",
  STAFF_CREATE: "staff:create",
  STAFF_UPDATE: "staff:update",
  STAFF_DEACTIVATE: "staff:deactivate",

  // ==========================================
  // Permission Management
  // ==========================================

  PERMISSION_VIEW: "permission:view",
  PERMISSION_ASSIGN: "permission:assign",

  // ==========================================
  // Approval Management
  // ==========================================

  APPROVAL_VIEW: "approval:view",
  APPROVAL_REVIEW: "approval:review",

  // ==========================================
  // Audit Management
  // ==========================================

  AUDIT_LOG_VIEW: "audit:view",
});

// ============================================
// Permission Metadata
// ============================================

export const PERMISSION_CATALOG = Object.freeze([
  {
    permission: PERMISSIONS.CUSTOMER_VIEW,
    description: "View customer records.",
  },
  {
    permission: PERMISSIONS.CUSTOMER_CREATE_RECORD,
    description: "Create customer profile records without login credentials.",
  },
  {
    permission: PERMISSIONS.CUSTOMER_UPDATE_PROFILE,
    description: "Update permitted customer profile information.",
  },
  {
    permission: PERMISSIONS.CUSTOMER_REQUEST_ACTIVATION,
    description: "Request customer account activation.",
    approvalRequired: true,
  },
  {
    permission: PERMISSIONS.CUSTOMER_REQUEST_DEACTIVATION,
    description: "Request customer account deactivation.",
    approvalRequired: true,
  },
  {
    permission: PERMISSIONS.CUSTOMER_REQUEST_PASSWORD_RESET,
    description: "Request a customer password reset.",
    approvalRequired: true,
  },
  {
    permission: PERMISSIONS.CUSTOMER_ACTIVATE,
    description: "Directly activate customer accounts.",
    adminOnly: true,
  },
  {
    permission: PERMISSIONS.CUSTOMER_DEACTIVATE,
    description: "Directly deactivate customer accounts.",
    adminOnly: true,
  },
  {
    permission: PERMISSIONS.CUSTOMER_RESET_PASSWORD,
    description: "Directly reset customer passwords.",
    adminOnly: true,
  },
  {
    permission: PERMISSIONS.STAFF_VIEW,
    description: "View staff records.",
    adminOnly: true,
  },
  {
    permission: PERMISSIONS.STAFF_CREATE,
    description: "Create staff accounts.",
    adminOnly: true,
  },
  {
    permission: PERMISSIONS.STAFF_UPDATE,
    description: "Update staff account information.",
    adminOnly: true,
  },
  {
    permission: PERMISSIONS.STAFF_DEACTIVATE,
    description: "Deactivate staff accounts.",
    adminOnly: true,
  },
  {
    permission: PERMISSIONS.PERMISSION_VIEW,
    description: "View permission assignments.",
  },
  {
    permission: PERMISSIONS.PERMISSION_ASSIGN,
    description: "Assign or modify staff permissions.",
    adminOnly: true,
  },
  {
    permission: PERMISSIONS.APPROVAL_VIEW,
    description: "View pending approval requests.",
  },
  {
    permission: PERMISSIONS.APPROVAL_REVIEW,
    description: "Approve or reject pending requests.",
    adminOnly: true,
  },
  {
    permission: PERMISSIONS.AUDIT_LOG_VIEW,
    description: "View system audit logs.",
    adminOnly: true,
  },
]);

// ============================================
// Default Role Permissions
// ============================================

/**
 * Default permissions for newly created Staff accounts.
 *
 * Admin can customize these permissions later.
 * Vital account changes remain approval-based.
 */
export const STAFF_DEFAULT_PERMISSIONS = Object.freeze([
  PERMISSIONS.CUSTOMER_VIEW,
  PERMISSIONS.CUSTOMER_CREATE_RECORD,
  PERMISSIONS.CUSTOMER_UPDATE_PROFILE,

  PERMISSIONS.CUSTOMER_REQUEST_ACTIVATION,
  PERMISSIONS.CUSTOMER_REQUEST_DEACTIVATION,
  PERMISSIONS.CUSTOMER_REQUEST_PASSWORD_RESET,

  PERMISSIONS.PERMISSION_VIEW,
  PERMISSIONS.APPROVAL_VIEW,
]);

/**
 * Customer permissions are restricted to their own records.
 *
 * Resource ownership must also be checked by backend
 * authorization middleware and controllers.
 */
export const CUSTOMER_DEFAULT_PERMISSIONS = Object.freeze([
  PERMISSIONS.CUSTOMER_VIEW,
]);

/**
 * Admin receives the complete permission catalog.
 *
 * Admin authorization will also verify that the
 * authenticated account has the ADMIN role.
 */
export const ADMIN_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));
