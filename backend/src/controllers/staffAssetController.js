import { getStaffAssetDownloadUrl } from "../services/staffAssetService.js";

// ============================================
// 1. GET STAFF ASSET DOWNLOAD URL
// GET /api/staff/:staffId/assets/:assetType
// GET /api/staff/:staffId/assets/:assetType/:documentType
// ============================================

export const getStaffAssetDownloadController = async (req, res) => {
  const { staffId, assetType, documentType } = req.validated.params;

  const result = await getStaffAssetDownloadUrl({
    staffId,
    assetType,
    documentType,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    message: "Staff asset download URL generated successfully.",
    data: result,
  });
};
