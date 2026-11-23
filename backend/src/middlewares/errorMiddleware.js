/**
 * Converts known application and database errors
 * into consistent API responses.
 */
export const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let message = "Internal server error.";

  // Application errors
  if (error.isOperational && Number.isInteger(error.statusCode)) {
    statusCode = error.statusCode;
    message = error.message;
  }

  // Zod request validation
  else if (error.name === "ZodError") {
    statusCode = 400;
    message = "Request validation failed.";
  }

  // Mongoose invalid ObjectId or failed casting
  else if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier.";
  }

  // Mongoose schema validation
  else if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed.";
  }

  // MongoDB duplicate key
  else if (error.code === 11000) {
    statusCode = 409;
    message = "A record with this information already exists.";
  }

  // Invalid JSON request body
  else if (error.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON request body.";
  }

  // Request body exceeds configured size
  else if (error.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large.";
  }

  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] [ERROR]`, {
      message: error.message,
      method: req.method,
      url: req.originalUrl,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }

  const response = {
    success: false,
    message:
      process.env.NODE_ENV === "development" && statusCode === 500
        ? error.message
        : message,
  };

  // Return safe, structured validation details.
  if (error.name === "ZodError") {
    response.errors = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  }

  res.status(statusCode).json(response);
};
