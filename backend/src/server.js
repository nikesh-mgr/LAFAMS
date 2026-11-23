import "dotenv/config";

import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";

// ============================================
// 1. Server Configuration
// ============================================

const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

let httpServer = null;
let isShuttingDown = false;

// ============================================
// 2. Application Logger
// ============================================

const log = {
  info: (message) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
  },

  success: (message) => {
    console.log(`[${new Date().toISOString()}] [SUCCESS] ${message}`);
  },

  warn: (message) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`);
  },

  error: (message, error = null) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);

    if (error) {
      console.error("Error:", error.message);

      if (NODE_ENV === "development") {
        console.error("Stack:", error.stack);
      }
    }
  },
};

// ============================================
// 3. Environment Validation
// ============================================

const validateEnvironment = () => {
  const requiredVariables = ["MONGODB_URI", "FRONTEND_URL", "SESSION_SECRET"];

  // Check missing variables first.
  const missingVariables = requiredVariables.filter(
    (variable) => !process.env[variable]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(", ")}`,
    );
  }

  // Validate session secret only after confirming it exists.
  const sessionSecret = process.env.SESSION_SECRET.trim();

  if (sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
};

// ============================================
// 4. HTTP Server Initialization
// ============================================

const startHttpServer = () => {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT);

    server.once("listening", () => {
      resolve(server);
    });

    server.once("error", reject);
  });
};

// ============================================
// 5. Graceful Shutdown
// ============================================

const shutdown = async (signal, exitCode = 0) => {
  if (isShuttingDown) return;

  isShuttingDown = true;

  log.warn(`Shutdown initiated: ${signal}`);

  try {
    if (httpServer) {
      await new Promise((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      log.success("HTTP server closed.");
    }

    await disconnectDB();

    log.success("MongoDB connection closed.");
  } catch (error) {
    log.error("Error during server shutdown.", error);
    exitCode = 1;
  }

  process.exitCode = exitCode;
};

// ============================================
// 6. Application Startup
// ============================================

const startServer = async () => {
  try {
    log.info("Starting LAFAms backend...");
    log.info(`Environment: ${NODE_ENV}`);
    log.info(`Port: ${PORT}`);

    // Validate environment before connecting to MongoDB.
    validateEnvironment();

    log.success("Environment validation completed.");

    // Connect to MongoDB before accepting requests.
    log.info("Connecting to MongoDB...");

    await connectDB();

    log.success("MongoDB connected successfully.");

    // Start Express server.
    httpServer = await startHttpServer();

    log.success(`LAFAms API running at http://localhost:${PORT}`);
    log.info(`Health check: http://localhost:${PORT}/api/health`);

    // Handle unexpected HTTP server errors.
    httpServer.on("error", (error) => {
      log.error("HTTP server error occurred.", error);

      void shutdown("HTTP_SERVER_ERROR", 1);
    });
  } catch (error) {
    log.error("LAFAms backend startup failed.", error);

    await disconnectDB().catch((dbError) => {
      log.error("Failed to close MongoDB connection.", dbError);
    });

    process.exitCode = 1;
  }
};

// ============================================
// 7. Process Signal Handling
// ============================================

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

// ============================================
// 8. Run Application
// ============================================

startServer();
