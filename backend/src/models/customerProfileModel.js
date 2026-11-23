import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const cloudinaryAssetSchema = new Schema(
  {
    publicId: { type: String, required: true, trim: true },
    assetId: { type: String, default: null },
    resourceType: {
      type: String,
      enum: ["image", "raw", "video"],
      required: true,
    },
    deliveryType: {
      type: String,
      enum: ["authenticated"],
      default: "authenticated",
      required: true,
    },
    format: { type: String, default: null },
    bytes: { type: Number, min: 0, default: 0 },
    originalFilename: { type: String, trim: true, default: null },
    version: { type: Number, default: null },
  },
  { _id: false },
);

const customerDocumentSchema = new Schema(
  {
    documentType: {
      type: String,
      enum: ["CITIZENSHIP_FRONT", "CITIZENSHIP_BACK", "OTHER"],
      required: true,
    },
    asset: { type: cloudinaryAssetSchema, required: true },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

const customerProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },

    fullName: {
      type: String,
      required: [true, "Customer name is required."],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    dateOfBirth: { type: Date, default: null },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      default: null,
    },

    phoneNumber: {
      type: String,
      required: [true, "Customer phone number is required."],
      trim: true,
      maxlength: 20,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: null,
    },

    address: {
      type: String,
      required: [true, "Customer address is required."],
      trim: true,
      maxlength: 300,
    },

    citizenshipNumber: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null,
    },

    profilePhoto: {
      type: cloudinaryAssetSchema,
      default: null,
    },

    documents: {
      type: [customerDocumentSchema],
      default: [],
    },

    // Customer profile access status.
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      required: true,
      index: true,
    },

    statusChangedAt: {
      type: Date,
      default: null,
    },

    statusChangedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

// A User account can be linked to only one Customer profile.
customerProfileSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user: { $type: "objectId" },
    },
    name: "unique_customer_profile_user",
  },
);

customerProfileSchema.index({ fullName: 1 });
customerProfileSchema.index({ phoneNumber: 1 });
customerProfileSchema.index({ status: 1, createdAt: -1 });

export const CustomerProfile =
  models.CustomerProfile || model("CustomerProfile", customerProfileSchema);
