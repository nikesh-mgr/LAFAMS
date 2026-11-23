import { getCustomerAssetDownloadUrl } from "../services/customerAssetService.js";

// ============================================
// 1. GET CUSTOMER ASSET DOWNLOAD URL
// GET /api/customers/:customerId/assets/:assetType
// GET /api/customers/:customerId/assets/:assetType/:documentType
// ============================================

export const getCustomerAssetDownloadController = async (req, res) => {
  const { customerId, assetType, documentType } = req.validated.params;

  const result = await getCustomerAssetDownloadUrl({
    customerId,
    assetType,
    documentType,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    message: "Customer asset download URL generated successfully.",
    data: result,
  });
};
