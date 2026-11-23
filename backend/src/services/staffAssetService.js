import mongoose from "mongoose";

import { StaffProfile } from "../models/staffProfileModel.js";
import { generateAccountAssetDownloadUrl } from "./cloudinaryService.js";
import { AppError } from "../utils/appError.js";

// ============================================
// CONSTANTS
// ============================================

const DOWNLOAD_EXPIRY_SECONDS = 15 * 60;

const STAFF_DOCUMENT_TYPES = ["CITIZENSHIP_FRONT", "CITIZENSHIP_BACK"];

// ============================================
// VALIDATION HELPERS
// ============================================

const ensureValidStaffId = (staffId) => {
  if (!mongoose.isValidObjectId(staffId)) {
    throw new AppError("Invalid Staff account ID.", 400);
  }
};

const ensureAuthorizedActor = (actor) => {
  if (!actor?.id || !actor?.role) {
    throw new AppError("Authenticated user information is missing.", 401);
  }

  if (actor.role !== "ADMIN") {
    throw new AppError("You are not authorized to access Staff assets.", 403);
  }
};

// ============================================
// 1. GET STAFF ASSET DOWNLOAD URL
// ============================================

export const getStaffAssetDownloadUrl = async ({
  staffId,
  assetType,
  documentType,
  actor,
}) => {
  ensureAuthorizedActor(actor);
  ensureValidStaffId(staffId);

  if (!["PROFILE_PHOTO", "DOCUMENT"].includes(assetType)) {
    throw new AppError("Invalid Staff asset type.", 400);
  }

  if (
    assetType === "DOCUMENT" &&
    !STAFF_DOCUMENT_TYPES.includes(documentType)
  ) {
    throw new AppError("Invalid Staff document type.", 400);
  }

  if (assetType === "PROFILE_PHOTO" && documentType !== undefined) {
    throw new AppError(
      "Document type must not be supplied for a profile photo.",
      400,
    );
  }

  // Find the Staff profile linked to the requested User account.
  const staffProfile = await StaffProfile.findOne({
    user: staffId,
  })
    .select("profilePhoto documents")
    .lean();

  if (!staffProfile) {
    throw new AppError("Staff profile not found.", 404);
  }

  let asset = null;

  if (assetType === "PROFILE_PHOTO") {
    asset = staffProfile.profilePhoto;
  }

  if (assetType === "DOCUMENT") {
    const document = staffProfile.documents?.find(
      (item) => item.documentType === documentType,
    );

    asset = document?.asset || null;
  }

  if (!asset?.publicId) {
    throw new AppError("The requested Staff asset was not found.", 404);
  }

  if (
    asset.deliveryType !== "authenticated" ||
    !["image", "raw"].includes(asset.resourceType)
  ) {
    throw new AppError(
      "The requested Staff asset is not available for secure delivery.",
      409,
    );
  }

  const downloadUrl = await generateAccountAssetDownloadUrl(asset, {
    expiresInSeconds: DOWNLOAD_EXPIRY_SECONDS,
    attachment: false,
  });

  return {
    downloadUrl,
    expiresInSeconds: DOWNLOAD_EXPIRY_SECONDS,
  };
};
