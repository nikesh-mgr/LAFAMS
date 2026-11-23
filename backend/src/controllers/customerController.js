import {
  createCustomerProfile,
  listCustomerProfiles,
  getCustomerProfileById,
  updateCustomerProfile,
  updateCustomerProfileStatus,
} from "../services/customerAccountService.js";

// ============================================
// 1. CREATE CUSTOMER PROFILE
// POST /api/customers
// ============================================

export const createCustomerController = async (req, res) => {
  const customer = await createCustomerProfile({
    customerData: req.validated.body,
    files: req.files || {},
    actor: req.user,
  });

  return res.status(201).json({
    success: true,
    message: "Customer profile created successfully.",
    data: {
      customer,
    },
  });
};

// ============================================
// 2. LIST CUSTOMER PROFILES
// GET /api/customers
// ============================================

export const listCustomersController = async (req, res) => {
  const result = await listCustomerProfiles(req.validated.query, req.user);

  return res.status(200).json({
    success: true,
    message: "Customer profiles retrieved successfully.",
    data: result,
  });
};

// ============================================
// 3. GET CUSTOMER PROFILE BY ID
// GET /api/customers/:customerId
// ============================================

export const getCustomerByIdController = async (req, res) => {
  const { customerId } = req.validated.params;

  const customer = await getCustomerProfileById(customerId, req.user);

  return res.status(200).json({
    success: true,
    message: "Customer profile retrieved successfully.",
    data: {
      customer,
    },
  });
};

// ============================================
// 4. UPDATE CUSTOMER PROFILE
// PATCH /api/customers/:customerId
// ============================================

export const updateCustomerController = async (req, res) => {
  const { customerId } = req.validated.params;

  const customer = await updateCustomerProfile({
    customerId,
    updateData: req.validated.body,
    files: req.files || {},
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    message: "Customer profile updated successfully.",
    data: {
      customer,
    },
  });
};

// ============================================
// 5. ACTIVATE / DEACTIVATE CUSTOMER
// PATCH /api/customers/:customerId/status
// ADMIN ONLY
// ============================================

export const updateCustomerStatusController = async (req, res) => {
  const { customerId } = req.validated.params;
  const { status } = req.validated.body;

  const customer = await updateCustomerProfileStatus({
    customerId,
    status,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    message: `Customer account ${status.toLowerCase()} successfully.`,
    data: {
      customer,
    },
  });
};
