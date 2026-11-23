import {
  createStaffAccount,
  listStaffAccounts,
  getStaffAccountById,
  updateStaffAccount,
  updateStaffAccountStatus,
  resetStaffPassword,
} from "../services/staffAccountService.js";

// ============================================
// 1. CREATE STAFF ACCOUNT
// ============================================

export const createStaffAccountController = async (req, res) => {
  const staffAccount = await createStaffAccount({
    ...req.validated.body,
    createdBy: req.user.id,

    // Staff profile photograph.
    profilePhoto: req.files?.profilePhoto?.[0] || null,

    // Citizenship front and back photographs.
    documents: req.files?.documents || [],

    // Document types parsed from multipart form data.
    documentTypes: req.validated.body.documentTypes || [],
  });

  return res.status(201).json({
    success: true,
    message: "Staff account created successfully.",
    data: {
      staffAccount,
    },
  });
};

// ============================================
// 2. LIST STAFF ACCOUNTS
// ============================================

export const listStaffAccountsController = async (req, res) => {
  const result = await listStaffAccounts(req.validated.query);

  return res.status(200).json({
    success: true,
    message: "Staff accounts retrieved successfully.",
    data: result,
  });
};

// ============================================
// 3. GET STAFF ACCOUNT BY ID
// ============================================

export const getStaffAccountByIdController = async (req, res) => {
  const { staffId } = req.validated.params;

  const staffAccount = await getStaffAccountById(staffId);

  return res.status(200).json({
    success: true,
    message: "Staff account retrieved successfully.",
    data: {
      staffAccount,
    },
  });
};

// ============================================
// 4. UPDATE STAFF ACCOUNT
// ============================================

export const updateStaffAccountController = async (req, res) => {
  const { staffId } = req.validated.params;
  const updateData = req.validated.body;

  const staffAccount = await updateStaffAccount(staffId, updateData);

  return res.status(200).json({
    success: true,
    message: "Staff account updated successfully.",
    data: {
      staffAccount,
    },
  });
};

// ============================================
// 5. ACTIVATE / DEACTIVATE STAFF ACCOUNT
// ============================================

export const updateStaffAccountStatusController = async (req, res) => {
  const { staffId } = req.validated.params;
  const { status } = req.validated.body;

  const staffAccount = await updateStaffAccountStatus(staffId, status);

  return res.status(200).json({
    success: true,
    message: `Staff account ${status.toLowerCase()} successfully.`,
    data: {
      staffAccount,
    },
  });
};

// ============================================
// 6. RESET STAFF PASSWORD
// ============================================

export const resetStaffPasswordController = async (req, res) => {
  const { staffId } = req.validated.params;
  const { password } = req.validated.body;

  const staffAccount = await resetStaffPassword(staffId, password);

  return res.status(200).json({
    success: true,
    message: "Staff password reset successfully.",
    data: {
      staffAccount,
    },
  });
};
