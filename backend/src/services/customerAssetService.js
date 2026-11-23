
import mongoose from "mongoose";

import { CustomerProfile } from "../models/customerProfileModel.js";
import { generateAccountAssetDownloadUrl } from "./cloudinaryService.js";
import { AppError } from "../utils/appError.js";

// ============================================
// CONSTANTS
// ============================================

const DOWNLOAD_EXPIRY_SECONDS = 15 * 60;

const CUSTOMER_DOCUMENT_TYPES = [
  "CITIZENSHIP_FRONT",
  "CITIZENSHIP_BACK",
  "OTHER",
];

// ============================================
// VALIDATION HELPERS
// ============================================

const ensureValidCustomerId = (customerId) => {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new AppError("Invalid Customer ID.", 400);
  }
};

const ensureAuthorizedActor = (actor) => {
  if (!actor?.id || !actor?.role) {
    throw new AppError("Authenticated user information is missing.", 401);
  }

  if (!["ADMIN", "STAFF", "CUSTOMER"].includes(actor.role)) {
    throw new AppError(
      "You are not authorized to access Customer assets.",
      403,
    );
  }
};

const getCustomerAccessFilter = (actor) => {
  if (actor.role === "CUSTOMER") {
    return {
      user: actor.id,
      status: "ACTIVE",
    };
  }

  return {};
};

// ============================================
// 1. GET CUSTOMER ASSET DOWNLOAD URL
// ============================================

export const getCustomerAssetDownloadUrl = async ({
  customerId,
  assetType,
  documentType,
  actor,
}) => {
  ensureAuthorizedActor(actor);
  ensureValidCustomerId(customerId);

  if (!["PROFILE_PHOTO", "DOCUMENT"].includes(assetType)) {
    throw new AppError("Invalid Customer asset type.", 400);
  }

  if (
    assetType === "DOCUMENT" &&
    !CUSTOMER_DOCUMENT_TYPES.includes(documentType)
  ) {
    throw new AppError("Invalid Customer document type.", 400);
  }

  if (assetType === "PROFILE_PHOTO" && documentType !== undefined) {
    throw new AppError(
      "Document type must not be supplied for a profile photo.",
      400,
    );
  }

  // Customers can only access their own active profile.
  // Admin and Staff access is controlled by route permissions.
  const customer = await CustomerProfile.findOne({
    _id: customerId,
    ...getCustomerAccessFilter(actor),
  })
    .select("profilePhoto documents")
    .lean();

  if (!customer) {
    throw new AppError("Customer profile not found.", 404);
  }

  let asset = null;

  if (assetType === "PROFILE_PHOTO") {
    asset = customer.profilePhoto;
  }

  if (assetType === "DOCUMENT") {
    const document = customer.documents?.find(
      (item) => item.documentType === documentType,
    );

    asset = document?.asset || null;
  }

  if (!asset?.publicId) {
    throw new AppError("The requested Customer asset was not found.", 404);
  }

  if (
    asset.deliveryType !== "authenticated" ||
    !["image", "raw"].includes(asset.resourceType)
  ) {
    throw new AppError(
      "The requested Customer asset is not available for secure delivery.",
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
