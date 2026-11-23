import mongoose from "mongoose";

import { User } from "../models/userModel.js";
import { StaffProfile } from "../models/staffProfileModel.js";

import { STAFF_DEFAULT_PERMISSIONS } from "../config/permissionCatalog.js";

import { hashPassword } from "./passwordService.js";

import { uploadAccountAsset, deleteAccountAsset } from "./cloudinaryService.js";

import { AppError } from "../utils/appError.js";

// ============================================
// CONSTANTS
// ============================================

const STAFF_ACCOUNT_FIELDS =
  "name username role status createdBy lastLoginAt passwordChangedAt createdAt updatedAt";

const REQUIRED_DOCUMENT_TYPES = ["CITIZENSHIP_FRONT", "CITIZENSHIP_BACK"];

// ============================================
// RESPONSE SERIALIZATION
// ============================================

// Only expose safe asset metadata.
// Never expose Cloudinary internal identifiers.
const serializeAsset = (asset) => {
  if (!asset) {
    return null;
  }

  return {
    resourceType: asset.resourceType,
    deliveryType: asset.deliveryType,
    format: asset.format,
    bytes: asset.bytes,
    originalFilename: asset.originalFilename,
    version: asset.version,
  };
};

const serializeStaffProfile = (profile) => {
  if (!profile) {
    return {
      profilePhoto: null,
      documents: [],
    };
  }

  return {
    profilePhoto: serializeAsset(profile.profilePhoto),

    documents: (profile.documents || []).map((document) => ({
      documentType: document.documentType,
      asset: serializeAsset(document.asset),
      uploadedAt: document.uploadedAt,
    })),
  };
};

const serializeStaffAccount = (staff, profile) => {
  const staffData =
    typeof staff.toObject === "function" ? staff.toObject() : { ...staff };

  return {
    ...staffData,
    ...serializeStaffProfile(profile),
  };
};

// ============================================
// SHARED HELPERS
// ============================================

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const handleDuplicateKeyError = (error) => {
  if (error?.code === 11000) {
    throw new AppError("Username is already in use.", 409);
  }

  throw error;
};

const ensureValidStaffId = (staffId) => {
  if (!mongoose.isValidObjectId(staffId)) {
    throw new AppError("Invalid Staff account ID.", 400);
  }
};

// Retrieves the User and its associated StaffProfile.
const findStaffAccount = async (staffId) => {
  ensureValidStaffId(staffId);

  const staff = await User.findOne({
    _id: staffId,
    role: "STAFF",
  }).select(STAFF_ACCOUNT_FIELDS);

  if (!staff) {
    throw new AppError("Staff account not found.", 404);
  }

  const profile = await StaffProfile.findOne({
    user: staff._id,
  })
    .select("profilePhoto documents")
    .lean();

  return serializeStaffAccount(staff, profile);
};

// ============================================
// CLOUDINARY HELPERS
// ============================================

const cleanupUploadedAssets = async (assets) => {
  if (!assets.length) {
    return;
  }

  await Promise.allSettled(assets.map((asset) => deleteAccountAsset(asset)));
};

/**
 * Uploads Staff profile and citizenship images.
 *
 * Uploaded assets are tracked so they can be removed
 * if Staff account creation fails.
 */
const uploadStaffAssets = async ({
  staffId,
  profilePhoto,
  documents = [],
  documentTypes = [],
  uploadedBy,
}) => {
  const uploadedAssets = [];

  try {
    let profilePhotoAsset = null;
    const staffDocuments = [];

    // Upload Staff profile photo.
    if (profilePhoto) {
      profilePhotoAsset = await uploadAccountAsset({
        buffer: profilePhoto.buffer,
        mimeType: profilePhoto.mimetype,
        originalFilename: profilePhoto.originalname,
        accountType: "staff",
        accountId: staffId.toString(),
        assetCategory: "profile",
      });

      uploadedAssets.push(profilePhotoAsset);
    }

    // Validate citizenship document uploads.
    if (documents.length > 0) {
      if (
        documents.length !== 2 ||
        !Array.isArray(documentTypes) ||
        documentTypes.length !== 2 ||
        REQUIRED_DOCUMENT_TYPES.some((type) => !documentTypes.includes(type))
      ) {
        throw new AppError(
          "Both citizenship front and back images are required.",
          400,
        );
      }

      // Match each uploaded image to its document type.
      for (let index = 0; index < documents.length; index += 1) {
        const file = documents[index];
        const documentType = documentTypes[index];

        const asset = await uploadAccountAsset({
          buffer: file.buffer,
          mimeType: file.mimetype,
          originalFilename: file.originalname,
          accountType: "staff",
          accountId: staffId.toString(),
          assetCategory: "documents",
        });

        uploadedAssets.push(asset);

        staffDocuments.push({
          documentType,
          asset,
          uploadedBy,
          uploadedAt: new Date(),
        });
      }
    } else if (documentTypes.length > 0) {
      throw new AppError(
        "Citizenship document types were provided without document images.",
        400,
      );
    }

    return {
      profilePhoto: profilePhotoAsset,
      documents: staffDocuments,
      uploadedAssets,
    };
  } catch (error) {
    await cleanupUploadedAssets(uploadedAssets);
    throw error;
  }
};

// ============================================
// 1. CREATE STAFF ACCOUNT
// ============================================

export const createStaffAccount = async ({
  name,
  username,
  password,
  createdBy,
  profilePhoto,
  documents = [],
  documentTypes = [],
}) => {
  const normalizedUsername = username.trim().toLowerCase();

  const existingUser = await User.exists({
    username: normalizedUsername,
  });

  if (existingUser) {
    throw new AppError("Username is already in use.", 409);
  }

  const hashedPassword = await hashPassword(password);

  // Generate the Staff ID before uploading assets.
  const staffId = new mongoose.Types.ObjectId();

  const uploadedStaffAssets = await uploadStaffAssets({
    staffId,
    profilePhoto,
    documents,
    documentTypes,
    uploadedBy: createdBy,
  });

  let session;

  try {
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      await User.create(
        [
          {
            _id: staffId,
            name: name.trim(),
            username: normalizedUsername,
            password: hashedPassword,
            role: "STAFF",
            status: "ACTIVE",
            createdBy,
            passwordChangedAt: new Date(),
          },
        ],
        { session },
      );

      await StaffProfile.create(
        [
          {
            user: staffId,
            profilePhoto: uploadedStaffAssets.profilePhoto,
            documents: uploadedStaffAssets.documents,
            permissions: [...STAFF_DEFAULT_PERMISSIONS],
          },
        ],
        { session },
      );
    });
  } catch (error) {
    await cleanupUploadedAssets(uploadedStaffAssets.uploadedAssets);
    handleDuplicateKeyError(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }

  return findStaffAccount(staffId);
};

// ============================================
// 2. LIST STAFF ACCOUNTS
// ============================================

export const listStaffAccounts = async ({
  page = 1,
  limit = 20,
  search,
  status,
  sortBy = "createdAt",
  sortOrder = "desc",
}) => {
  const filter = {
    role: "STAFF",
  };

  if (status) {
    filter.status = status;
  }

  if (search) {
    const searchPattern = new RegExp(escapeRegex(search.trim()), "i");

    filter.$or = [{ name: searchPattern }, { username: searchPattern }];
  }

  const skip = (page - 1) * limit;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const sortOptions = {
    [sortBy]: sortDirection,
    _id: 1,
  };

  const [staffAccounts, total] = await Promise.all([
    User.find(filter)
      .select(STAFF_ACCOUNT_FIELDS)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(),

    User.countDocuments(filter),
  ]);

  // Retrieve associated StaffProfiles in one query.
  const staffIds = staffAccounts.map((staff) => staff._id);

  const profiles = staffIds.length
    ? await StaffProfile.find({
        user: { $in: staffIds },
      })
        .select("user profilePhoto documents")
        .lean()
    : [];

  const profileMap = new Map(
    profiles.map((profile) => [profile.user.toString(), profile]),
  );

  const serializedStaffAccounts = staffAccounts.map((staff) =>
    serializeStaffAccount(staff, profileMap.get(staff._id.toString())),
  );

  return {
    staffAccounts: serializedStaffAccounts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
};

// ============================================
// 3. GET STAFF ACCOUNT BY ID
// ============================================

export const getStaffAccountById = async (staffId) => {
  return findStaffAccount(staffId);
};

// ============================================
// 4. UPDATE STAFF ACCOUNT
// ============================================

export const updateStaffAccount = async (staffId, updateData) => {
  await findStaffAccount(staffId);

  const updates = {};

  if (updateData.name !== undefined) {
    updates.name = updateData.name.trim();
  }

  if (updateData.username !== undefined) {
    updates.username = updateData.username.trim().toLowerCase();
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("No valid update fields provided.", 400);
  }

  try {
    const updatedStaff = await User.findOneAndUpdate(
      {
        _id: staffId,
        role: "STAFF",
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      },
    ).select(STAFF_ACCOUNT_FIELDS);

    if (!updatedStaff) {
      throw new AppError("Staff account not found.", 404);
    }
  } catch (error) {
    handleDuplicateKeyError(error);
  }

  return findStaffAccount(staffId);
};

// ============================================
// 5. ACTIVATE / DEACTIVATE STAFF ACCOUNT
// ============================================

export const updateStaffAccountStatus = async (staffId, status) => {
  ensureValidStaffId(staffId);

  const updatedStaff = await User.findOneAndUpdate(
    {
      _id: staffId,
      role: "STAFF",
    },
    {
      $set: { status },
      $inc: { sessionVersion: 1 },
    },
    {
      new: true,
      runValidators: true,
    },
  ).select(STAFF_ACCOUNT_FIELDS);

  if (!updatedStaff) {
    throw new AppError("Staff account not found.", 404);
  }

  return findStaffAccount(staffId);
};

// ============================================
// 6. RESET STAFF PASSWORD
// ============================================

export const resetStaffPassword = async (staffId, newPassword) => {
  ensureValidStaffId(staffId);

  const hashedPassword = await hashPassword(newPassword);

  const updatedStaff = await User.findOneAndUpdate(
    {
      _id: staffId,
      role: "STAFF",
    },
    {
      $set: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
      $inc: { sessionVersion: 1 },
    },
    {
      new: true,
      runValidators: true,
    },
  ).select(STAFF_ACCOUNT_FIELDS);

  if (!updatedStaff) {
    throw new AppError("Staff account not found.", 404);
  }

  return findStaffAccount(staffId);
};
