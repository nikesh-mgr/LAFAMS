import multer from "multer";

import { AppError } from "../utils/appError.js";

// ============================================
// UPLOAD CONFIGURATION
// ============================================

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 3;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Both profile photos and citizenship document photos
// currently accept image files only.
const UPLOAD_FIELDS = [
  { name: "profilePhoto", maxCount: 1 },
  { name: "documents", maxCount: 2 },
];

// ============================================
// FILE SIGNATURE VALIDATION
// ============================================

/**
 * Detects the actual image type from its binary signature.
 */
const getActualFileType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG
  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }

  // WebP: RIFF....WEBP
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
};

// ============================================
// UPLOADED FILE VALIDATION
// ============================================

const validateUploadedFiles = (req, res, next) => {
  try {
    const files = req.files || {};

    const profilePhotos = files.profilePhoto || [];
    const documents = files.documents || [];

    const uploadedFiles = [...profilePhotos, ...documents];

    for (const file of uploadedFiles) {
      const actualType = getActualFileType(file.buffer);

      if (
        !actualType ||
        !ALLOWED_IMAGE_TYPES.includes(actualType) ||
        actualType !== file.mimetype
      ) {
        throw new AppError(
          "Only valid JPEG, PNG, or WebP images are allowed.",
          400,
        );
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

// ============================================
// MULTER CONFIGURATION
// ============================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
    fields: 20,
    parts: 23,
  },

  fileFilter: (req, file, callback) => {
    const allowedFieldNames = ["profilePhoto", "documents"];

    if (!allowedFieldNames.includes(file.fieldname)) {
      return callback(new AppError("Unexpected file upload field.", 400));
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return callback(
        new AppError("Only JPEG, PNG, or WebP images are allowed.", 400),
      );
    }

    return callback(null, true);
  },
});

// ============================================
// SHARED UPLOAD HANDLER
// ============================================

/**
 * Creates a reusable upload middleware.
 *
 * Upload files remain in memory until the relevant
 * service stores them in Cloudinary.
 */
const createUploadMiddleware = (fields) => {
  return (req, res, next) => {
    upload.fields(fields)(req, res, (error) => {
      if (error) {
        if (error instanceof multer.MulterError) {
          if (error.code === "LIMIT_FILE_SIZE") {
            return next(
              new AppError("Each uploaded image must not exceed 5 MB.", 413),
            );
          }

          if (error.code === "LIMIT_FILE_COUNT") {
            return next(new AppError("Too many images were uploaded.", 400));
          }

          if (error.code === "LIMIT_UNEXPECTED_FILE") {
            return next(
              new AppError("Unexpected upload field or too many images.", 400),
            );
          }

          return next(new AppError("Image upload validation failed.", 400));
        }

        return next(error);
      }

      return validateUploadedFiles(req, res, next);
    });
  };
};

// ============================================
// SHARED ACCOUNT UPLOAD MIDDLEWARE
// ============================================

/**
 * Customer and Staff account creation.
 *
 * Accepts:
 * - profilePhoto: one image
 * - documents: up to two citizenship images
 */
export const uploadAccountFiles = createUploadMiddleware(UPLOAD_FIELDS);

/**
 * Customer and Staff profile updates.
 *
 * Accepts:
 * - profilePhoto: one image
 *
 * Citizenship document updates should use a separate
 * service operation when document management is implemented.
 */
export const uploadAccountProfilePhoto = createUploadMiddleware([
  { name: "profilePhoto", maxCount: 1 },
]);

// ============================================
// CUSTOMER AND STAFF EXPORTS
// ============================================

// Customer
export const uploadCustomerFiles = uploadAccountFiles;
export const uploadCustomerProfilePhoto = uploadAccountProfilePhoto;

// Staff
export const uploadStaffFiles = uploadAccountFiles;
export const uploadStaffProfilePhoto = uploadAccountProfilePhoto;

// ============================================
// MULTIPART FIELD PARSER
// ============================================

/**
 * Parses JSON-encoded documentTypes from multipart form data.
 *
 * Example:
 * documentTypes =
 * ["CITIZENSHIP_FRONT","CITIZENSHIP_BACK"]
 *
 * Zod remains responsible for validating the array values,
 * duplicates, and required document types.
 */
export const parseAccountMultipartFields = (req, res, next) => {
  try {
    if (
      req.body &&
      Object.prototype.hasOwnProperty.call(req.body, "documentTypes")
    ) {
      const documentTypes = req.body.documentTypes;

      if (typeof documentTypes === "string") {
        try {
          req.body.documentTypes = JSON.parse(documentTypes);
        } catch {
          throw new AppError("documentTypes must be a valid JSON array.", 400);
        }
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

// Backward-compatible Customer export.
export const parseCustomerMultipartFields = parseAccountMultipartFields;
