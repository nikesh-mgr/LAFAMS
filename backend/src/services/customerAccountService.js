import mongoose from "mongoose";

import { CustomerProfile } from "../models/customerProfileModel.js";
import { User } from "../models/userModel.js";

import {
  uploadCustomerAsset,
  deleteCustomerAsset,
} from "./cloudinaryService.js";

import { AppError } from "../utils/appError.js";

// ============================================
// CONSTANTS
// ============================================

const CUSTOMER_PROFILE_FIELDS =
  "user fullName dateOfBirth gender phoneNumber email address citizenshipNumber profilePhoto documents status statusChangedAt statusChangedBy createdBy updatedBy createdAt updatedAt";

const CUSTOMER_LIST_FIELDS =
  "fullName dateOfBirth gender phoneNumber email address status profilePhoto createdAt updatedAt";

// ============================================
// RESPONSE SERIALIZATION
// ============================================

// Never expose Cloudinary public IDs, asset IDs, or internal
// storage metadata through Customer API responses.

const serializeAsset = (asset) => {
  if (!asset?.publicId) {
    return null;
  }

  return {
    available: true,
    format: asset.format || null,
    bytes: asset.bytes || 0,
  };
};

const serializeCustomer = (customer) => {
  if (!customer) {
    return customer;
  }

  const { user, profilePhoto, documents, ...safeCustomer } = customer;

  return {
    ...safeCustomer,

    profilePhoto: serializeAsset(profilePhoto),

    ...(documents !== undefined && {
      documents: documents.map((document) => ({
        documentType: document.documentType,
        uploadedAt: document.uploadedAt,
        asset: serializeAsset(document.asset),
      })),
    }),
  };
};

// ============================================
// SHARED HELPERS
// ============================================

const ensureValidCustomerId = (customerId) => {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new AppError("Invalid Customer ID.", 400);
  }
};

const ensureStaffOrAdmin = (actor) => {
  if (!["ADMIN", "STAFF"].includes(actor?.role)) {
    throw new AppError(
      "You are not authorized to manage Customer profiles.",
      403,
    );
  }
};

const ensureAdmin = (actor) => {
  if (actor?.role !== "ADMIN") {
    throw new AppError(
      "Only Admin can activate or deactivate Customer accounts.",
      403,
    );
  }
};

const getCustomerAccessFilter = (actor) => {
  if (!actor?.id || !actor?.role) {
    throw new AppError("Authenticated user information is missing.", 401);
  }

  if (actor.role === "CUSTOMER") {
    return {
      user: actor.id,
      status: "ACTIVE",
    };
  }

  if (["ADMIN", "STAFF"].includes(actor.role)) {
    return {};
  }

  throw new AppError("You are not authorized to view Customer profiles.", 403);
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const normalizeOptionalValue = (value) => {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
};

const cleanupUploadedAssets = async (assets) => {
  await Promise.allSettled(assets.map((asset) => deleteCustomerAsset(asset)));
};

// ============================================
// 1. CREATE CUSTOMER PROFILE
// ============================================

export const createCustomerProfile = async ({
  customerData,
  files = {},
  actor,
}) => {
  ensureStaffOrAdmin(actor);

  const uploadedAssets = [];
  let customerSaved = false;

  try {
    const profilePhotoFile = files.profilePhoto?.[0];
    const documentFiles = files.documents || [];
    const documentTypes = customerData.documentTypes || [];

    if (documentFiles.length !== documentTypes.length) {
      throw new AppError(
        "The number of uploaded documents must match the supplied document types.",
        400,
      );
    }

    if (documentFiles.length > 2) {
      throw new AppError(
        "A maximum of two citizenship documents is allowed.",
        400,
      );
    }

    if (documentFiles.length > 0 && documentTypes.length !== 2) {
      throw new AppError(
        "Both citizenship document types must be provided.",
        400,
      );
    }

    const customerId = new mongoose.Types.ObjectId();

    let profilePhoto = null;

    if (profilePhotoFile) {
      profilePhoto = await uploadCustomerAsset({
        buffer: profilePhotoFile.buffer,
        mimeType: profilePhotoFile.mimetype,
        originalFilename: profilePhotoFile.originalname,
        customerId: customerId.toString(),
        assetCategory: "profile",
      });

      uploadedAssets.push(profilePhoto);
    }

    const documents = [];

    for (let index = 0; index < documentFiles.length; index += 1) {
      const file = documentFiles[index];

      const asset = await uploadCustomerAsset({
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalFilename: file.originalname,
        customerId: customerId.toString(),
        assetCategory: "documents",
      });

      uploadedAssets.push(asset);

      documents.push({
        documentType: documentTypes[index],
        asset,
        uploadedBy: actor.id,
        uploadedAt: new Date(),
      });
    }

    const customer = new CustomerProfile({
      _id: customerId,
      fullName: customerData.fullName,
      dateOfBirth: customerData.dateOfBirth || null,
      gender: customerData.gender || null,
      phoneNumber: customerData.phoneNumber,
      email: normalizeOptionalValue(customerData.email) ?? null,
      address: customerData.address,
      citizenshipNumber:
        normalizeOptionalValue(customerData.citizenshipNumber) ?? null,
      profilePhoto,
      documents,
      status: "ACTIVE",
      createdBy: actor.id,
    });

    await customer.save();
    customerSaved = true;

    const savedCustomer = await CustomerProfile.findById(customer._id)
      .select(CUSTOMER_PROFILE_FIELDS)
      .lean();

    return serializeCustomer(savedCustomer);
  } catch (error) {
    if (!customerSaved) {
      await cleanupUploadedAssets(uploadedAssets);
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Customer profile creation failed.", 500);
  }
};

// ============================================
// 2. LIST CUSTOMER PROFILES
// ============================================

export const listCustomerProfiles = async (
  {
    page = 1,
    limit = 20,
    search,
    gender,
    status = "ACTIVE",
    sortBy = "createdAt",
    sortOrder = "desc",
  },
  actor,
) => {
  const accessFilter = getCustomerAccessFilter(actor);

  // Customers can only retrieve their own active profile.
  if (actor.role === "CUSTOMER" && status !== "ACTIVE") {
    throw new AppError("You cannot access an inactive Customer profile.", 403);
  }

  const filter = {
    ...accessFilter,
    status,
  };

  if (gender) {
    filter.gender = gender;
  }

  if (search) {
    const searchPattern = new RegExp(escapeRegex(search.trim()), "i");

    filter.$or = [
      { fullName: searchPattern },
      { phoneNumber: searchPattern },
      { email: searchPattern },
      { citizenshipNumber: searchPattern },
    ];
  }

  const skip = (page - 1) * limit;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const sortOptions = {
    [sortBy]: sortDirection,
    _id: 1,
  };

  const [customers, total] = await Promise.all([
    CustomerProfile.find(filter)
      .select(
        actor.role === "CUSTOMER"
          ? CUSTOMER_LIST_FIELDS
          : CUSTOMER_PROFILE_FIELDS,
      )
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(),

    CustomerProfile.countDocuments(filter),
  ]);

  return {
    customers: customers.map(serializeCustomer),

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
// 3. GET CUSTOMER PROFILE BY ID
// ============================================

export const getCustomerProfileById = async (customerId, actor) => {
  ensureValidCustomerId(customerId);

  const accessFilter = getCustomerAccessFilter(actor);

  const customer = await CustomerProfile.findOne({
    _id: customerId,
    ...accessFilter,
  })
    .select(
      actor.role === "CUSTOMER"
        ? CUSTOMER_LIST_FIELDS
        : CUSTOMER_PROFILE_FIELDS,
    )
    .lean();

  if (!customer) {
    throw new AppError("Customer profile not found.", 404);
  }

  return serializeCustomer(customer);
};

// ============================================
// 4. UPDATE CUSTOMER PROFILE
// ============================================

export const updateCustomerProfile = async ({
  customerId,
  updateData,
  files = {},
  actor,
}) => {
  ensureStaffOrAdmin(actor);
  ensureValidCustomerId(customerId);

  const customer = await CustomerProfile.findOne({
    _id: customerId,
  });

  if (!customer) {
    throw new AppError("Customer profile not found.", 404);
  }

  const uploadedAssets = [];
  const previousProfilePhoto = customer.profilePhoto;

  let customerSaved = false;

  try {
    const permittedFields = [
      "fullName",
      "dateOfBirth",
      "gender",
      "phoneNumber",
      "email",
      "address",
      "citizenshipNumber",
    ];

    for (const field of permittedFields) {
      if (updateData[field] !== undefined) {
        customer[field] = normalizeOptionalValue(updateData[field]);
      }
    }

    const profilePhotoFile = files.profilePhoto?.[0];

    if (profilePhotoFile) {
      const newProfilePhoto = await uploadCustomerAsset({
        buffer: profilePhotoFile.buffer,
        mimeType: profilePhotoFile.mimetype,
        originalFilename: profilePhotoFile.originalname,
        customerId: customer._id.toString(),
        assetCategory: "profile",
      });

      uploadedAssets.push(newProfilePhoto);
      customer.profilePhoto = newProfilePhoto;
    }

    customer.updatedBy = actor.id;

    await customer.save();
    customerSaved = true;

    if (profilePhotoFile && previousProfilePhoto?.publicId) {
      try {
        await deleteCustomerAsset(previousProfilePhoto);
      } catch (error) {
        console.error(
          "Previous Customer profile photo cleanup failed:",
          error.message,
        );
      }
    }

    const updatedCustomer = await CustomerProfile.findById(customer._id)
      .select(CUSTOMER_PROFILE_FIELDS)
      .lean();

    return serializeCustomer(updatedCustomer);
  } catch (error) {
    if (!customerSaved) {
      await cleanupUploadedAssets(uploadedAssets);
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Customer profile update failed.", 500);
  }
};

// ============================================
// 5. ACTIVATE / DEACTIVATE CUSTOMER
// ADMIN ONLY
// ============================================

export const updateCustomerProfileStatus = async ({
  customerId,
  status,
  actor,
}) => {
  ensureAdmin(actor);
  ensureValidCustomerId(customerId);

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    throw new AppError("Invalid Customer account status.", 400);
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const customer =
        await CustomerProfile.findById(customerId).session(session);

      if (!customer) {
        throw new AppError("Customer profile not found.", 404);
      }

      // Do not increment sessionVersion repeatedly when
      // the requested status is already in effect.
      if (customer.status === status) {
        return;
      }

      customer.status = status;
      customer.statusChangedAt = new Date();
      customer.statusChangedBy = actor.id;
      customer.updatedBy = actor.id;

      await customer.save({ session });

      // Update the linked Customer login account, if present.
      if (customer.user) {
        const userUpdate = await User.updateOne(
          {
            _id: customer.user,
            role: "CUSTOMER",
          },
          {
            $set: {
              status,
            },
            $inc: {
              sessionVersion: 1,
            },
          },
          { session },
        );

        if (userUpdate.matchedCount !== 1) {
          throw new AppError(
            "The linked Customer login account could not be found. The status change was not completed.",
            409,
          );
        }
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Customer account status update failed.", 500);
  } finally {
    await session.endSession();
  }

  const updatedCustomer = await CustomerProfile.findById(customerId)
    .select(CUSTOMER_PROFILE_FIELDS)
    .lean();

  return serializeCustomer(updatedCustomer);
};
