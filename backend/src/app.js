import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";

import { AppError } from "./utils/appError.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import { sessionMiddleware } from "./middlewares/sessionMiddleware.js";
import { requireCsrf } from "./middlewares/csrfMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";

const app = express();

// ============================================
// 1. SECURITY MIDDLEWARE
// ============================================

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  }),
);

// ============================================
// 2. REQUEST PARSING
// ============================================

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
);

// ============================================
// 3. API RATE LIMITING
// ============================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

// ============================================
// 4. REQUEST LOGGING
// ============================================

app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    const logMessage = [
      `[${new Date().toISOString()}]`,
      `[${res.statusCode}]`,
      req.method,
      req.originalUrl,
      `${duration}ms`,
    ].join(" ");

    if (res.statusCode >= 500) {
      console.error(logMessage);
    } else if (res.statusCode >= 400) {
      console.warn(logMessage);
    } else if (process.env.NODE_ENV === "development") {
      console.info(logMessage);
    }
  });

  next();
});

// ============================================
// 5. HEALTH AND READINESS CHECKS
// ============================================

const liveHandler = (req, res) => {
  return res.status(200).json({
    success: true,
    status: "alive",
    message: "LAFAms API is running.",
    timestamp: new Date().toISOString(),
  });
};

const readyHandler = (req, res) => {
  const isDatabaseConnected = mongoose.connection.readyState === 1;

  return res.status(isDatabaseConnected ? 200 : 503).json({
    success: isDatabaseConnected,
    status: isDatabaseConnected ? "ready" : "not_ready",
    message: isDatabaseConnected
      ? "LAFAms API is ready."
      : "Database connection is unavailable.",
    database: {
      status: isDatabaseConnected ? "connected" : "disconnected",
    },
    timestamp: new Date().toISOString(),
  });
};

app.get("/api/health/live", liveHandler);
app.get("/api/health/ready", readyHandler);
app.get("/api/health", liveHandler);

// ============================================
// 6. SESSION AND CSRF PROTECTION
// ============================================

app.use("/api", sessionMiddleware);
app.use("/api", requireCsrf);

// ============================================
// 7. AUTHENTICATION ROUTES
// ============================================

app.use("/api/auth", authRoutes);

// ============================================
// 8. ADMIN ROUTES
// ============================================

// Staff account and permission management.
// All routes require an authenticated Admin.
app.use("/api/staff", staffRoutes);

// ============================================
// 9. CUSTOMER ROUTES
// ============================================

// Customer profile management.
// Access is controlled by authentication,
// permissions, role checks, and ownership checks.
app.use("/api/customers", customerRoutes);

// ============================================
// 10. API NOT FOUND HANDLER
// ============================================

app.use("/api", (req, res, next) => {
  next(
    new AppError(`API route not found: ${req.method} ${req.originalUrl}`, 404),
  );
});

// ============================================
// 11. GLOBAL ERROR HANDLER
// ============================================

app.use(errorMiddleware);

export default app;
