import { z } from "zod";

// ============================================
// COMMON VALIDATION SCHEMAS
// ============================================

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid Customer ID.");

const customerStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Customer name must contain at least 2 characters.")
  .max(100, "Customer name cannot exceed 100 characters.");

const phoneNumberSchema = z
  .string()
  .trim()
  .min(8, "Enter a valid phone number.")
  .max(20, "Phone number cannot exceed 20 characters.")
  .regex(/^\+?[0-9][0-9\s()-]*$/, "Enter a valid phone number.");

const emailSchema = z
  .email("Enter a valid email address.")
  .trim()
  .toLowerCase()
  .max(254, "Email cannot exceed 254 characters.");

const addressSchema = z
  .string()
  .trim()
  .min(2, "Customer address must contain at least 2 characters.")
  .max(300, "Address cannot exceed 300 characters.");

const citizenshipNumberSchema = z
  .string()
  .trim()
  .min(1, "Citizenship number cannot be empty.")
  .max(50, "Citizenship number cannot exceed 50 characters.");

const dateOfBirthSchema = z.iso
  .date("Date of birth must use YYYY-MM-DD format.")
  .refine(
    (value) => new Date(`${value}T00:00:00.000Z`) <= new Date(),
    "Date of birth cannot be in the future.",
  );

// ============================================
// CREATE CUSTOMER PROFILE
// ============================================

export const createCustomerSchema = z
  .object({
    fullName: fullNameSchema,
    dateOfBirth: dateOfBirthSchema.nullable().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
    phoneNumber: phoneNumberSchema,
    email: emailSchema.nullable().optional(),
    address: addressSchema,
    citizenshipNumber: citizenshipNumberSchema.nullable().optional(),

    documentTypes: z
      .array(z.enum(["CITIZENSHIP_FRONT", "CITIZENSHIP_BACK"]))
      .max(2, "A maximum of two citizenship documents is allowed.")
      .refine(
        (types) => new Set(types).size === types.length,
        "Duplicate citizenship document types are not allowed.",
      )
      .optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (
      data.documentTypes &&
      data.documentTypes.length > 0 &&
      data.documentTypes.length !== 2
    ) {
      context.addIssue({
        code: "custom",
        path: ["documentTypes"],
        message:
          "Provide both citizenship document types when specifying document types.",
      });
    }
  });

// ============================================
// LIST CUSTOMER PROFILES
// ============================================

export const listCustomersSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    search: z
      .string()
      .trim()
      .max(100, "Search cannot exceed 100 characters.")
      .optional(),

    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),

    status: customerStatusSchema.default("ACTIVE"),

    sortBy: z
      .enum(["fullName", "phoneNumber", "createdAt", "updatedAt"])
      .default("createdAt"),

    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

// ============================================
// CUSTOMER ROUTE PARAMETERS
// ============================================

export const customerParamsSchema = z
  .object({
    customerId: objectIdSchema,
  })
  .strict();

// ============================================
// CUSTOMER ASSET DOWNLOAD PARAMETERS
// ============================================

export const customerAssetParamsSchema = z
  .object({
    customerId: objectIdSchema,

    assetType: z.enum(["PROFILE_PHOTO", "DOCUMENT"]),

    documentType: z
      .enum(["CITIZENSHIP_FRONT", "CITIZENSHIP_BACK", "OTHER"])
      .optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.assetType === "DOCUMENT" && !data.documentType) {
      context.addIssue({
        code: "custom",
        path: ["documentType"],
        message: "Document type is required for Customer document access.",
      });
    }

    if (data.assetType === "PROFILE_PHOTO" && data.documentType) {
      context.addIssue({
        code: "custom",
        path: ["documentType"],
        message: "Document type is not allowed for profile photo access.",
      });
    }
  });

// ============================================
// UPDATE CUSTOMER PROFILE
// ============================================

export const updateCustomerSchema = z
  .object({
    fullName: fullNameSchema.optional(),

    dateOfBirth: dateOfBirthSchema.nullable().optional(),

    gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),

    phoneNumber: phoneNumberSchema.optional(),

    email: emailSchema.nullable().optional(),

    address: addressSchema.optional(),

    citizenshipNumber: citizenshipNumberSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one Customer profile field must be provided for update.",
  );

// ============================================
// ACTIVATE / DEACTIVATE CUSTOMER
// ============================================

export const updateCustomerStatusSchema = z
  .object({
    status: customerStatusSchema,
  })
  .strict();
