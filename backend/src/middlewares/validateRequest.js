import { ZodError } from "zod";

const allowedSections = ["body", "params", "query"];

/**
 * Validates selected Express request sections using Zod.
 *
 * Example:
 * validateRequest({
 *   body: loginSchema,
 *   params: userIdSchema,
 * });
 *
 * Controllers should use req.validated instead of
 * accessing unvalidated request data.
 */
export const validateRequest = (schemas) => {
  // Validate middleware configuration during route registration.
  if (!schemas || typeof schemas !== "object" || Array.isArray(schemas)) {
    throw new TypeError("Validation schemas must be an object.");
  }

  const sections = Object.keys(schemas);

  if (sections.length === 0) {
    throw new TypeError("At least one validation schema is required.");
  }

  for (const section of sections) {
    if (!allowedSections.includes(section)) {
      throw new TypeError(`Unsupported validation section: ${section}`);
    }

    if (typeof schemas[section]?.safeParse !== "function") {
      throw new TypeError(`A valid Zod schema is required for "${section}".`);
    }
  }

  return (req, res, next) => {
    const validated = {};

    try {
      for (const section of sections) {
        const result = schemas[section].safeParse(req[section]);

        if (!result.success) {
          return next(result.error);
        }

        // Store parsed data, including Zod transformations.
        validated[section] = result.data;
      }

      req.validated = validated;

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
