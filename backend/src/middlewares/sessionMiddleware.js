import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";

const SESSION_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours

let configuredSessionMiddleware = null;

/**
 * Creates the session middleware using the existing
 * Mongoose MongoDB connection.
 *
 * The middleware initializes lazily because the database
 * connection is established before the HTTP server starts.
 */
export const sessionMiddleware = (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return next(new Error("MongoDB is unavailable for session storage."));
    }

    if (!configuredSessionMiddleware) {
      const sessionStore = MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: "sessions",
        ttl: SESSION_MAX_AGE / 1000,
      });

      configuredSessionMiddleware = session({
        name: "lafams.sid",
        secret: process.env.SESSION_SECRET,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: SESSION_MAX_AGE,
        },
      });
    }

    return configuredSessionMiddleware(req, res, next);
  } catch (error) {
    return next(error);
  }
};
