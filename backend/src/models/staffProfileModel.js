
import mongoose from "mongoose";

import {
  PERMISSION_CATALOG,
  STAFF_DEFAULT_PERMISSIONS,
} from "../config/permissionCatalog.js";

const { Schema, model, models } = mongoose;

// ============================================
// CLOUDINARY ASSET SCHEMA
// ============================================

const cloudinaryAssetSchema = new Schema(
  {
    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    assetId: {
      type: String,
      default: null,
    },

    resourceType: {
      type: String,
      enum: ["image", "raw", "video"],
      required: true,
    },

    deliveryType: {
      type: String,
      enum: ["authenticated"],
      required: true,
      default: "authenticated",
    },

    format: {
      type: String,
      default: null,
    },

    bytes: {
      type: Number,
      default: 0,
      min: 0,
    },

    originalFilename: {
      type: String,
      default: null,
    },

    version: {
      type: Number,
      default: null,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

// ============================================
// STAFF CITIZENSHIP DOCUMENT SCHEMA
// ============================================

const staffDocumentSchema = new Schema(
  {
    documentType: {
      type: String,
      required: true,
      enum: ["CITIZENSHIP_FRONT", "CITIZENSHIP_BACK"],
    },

    asset: {
      type: cloudinaryAssetSchema,
      required: true,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

// ============================================
// STAFF PROFILE SCHEMA
// ============================================

const validPermissions = PERMISSION_CATALOG.map(
  (item) => item.permission,
);

const staffProfileSchema = new Schema(
  {
    // Linked Staff login account.
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Staff user reference is required."],
    },

    // Staff profile photograph.
    profilePhoto: {
      type: cloudinaryAssetSchema,
      default: null,
    },

    // Staff citizenship front and back photographs.
    documents: {
      type: [staffDocumentSchema],
      default: [],
    },

    // Assigned Staff permissions.
    permissions: {
      type: [
        {
          type: String,
          enum: {
            values: validPermissions,
            message: "Invalid staff permission: {VALUE}.",
          },
        },
      ],
      default: () => [...STAFF_DEFAULT_PERMISSIONS],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ============================================
// DATABASE INDEXES
// ============================================

// Each Staff account can have only one profile.
staffProfileSchema.index(
  { user: 1 },
  {
    unique: true,
    name: "unique_staff_profile_user",
  },
);

// ============================================
// MODEL EXPORT
// ============================================

export const StaffProfile =
  models.StaffProfile || model("StaffProfile", staffProfileSchema);
