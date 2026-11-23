import mongoose from "mongoose";

import { User } from "../models/userModel.js";
import { AppError } from "../utils/appError.js";

/**
 * Destroys the current session.
 */
const destroySession = (req) =>
  new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

/**
 * Ensures that the request belongs to an active,
 * authenticated user with a valid session version.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const sessionUser = req.session?.user;

    if (!sessionUser?.id || !sessionUser?.role) {
      throw new AppError("Authentication is required.", 401);
    }

    if (!mongoose.isValidObjectId(sessionUser.id)) {
      await destroySession(req);

      throw new AppError("Invalid session. Please log in again.", 401);
    }

    const user = await User.findById(sessionUser.id).select(
      "_id username role status sessionVersion",
    );

    if (!user) {
      await destroySession(req);

      throw new AppError(
        "Your session is no longer valid. Please log in again.",
        401,
      );
    }

    const currentSessionVersion = user.sessionVersion ?? 0;
    const sessionVersion = sessionUser.sessionVersion ?? 0;

    const sessionIsInvalid =
      user.status !== "ACTIVE" ||
      user.role !== sessionUser.role ||
      currentSessionVersion !== sessionVersion;

    if (sessionIsInvalid) {
      await destroySession(req);

      throw new AppError(
        "Your session is no longer valid. Please log in again.",
        401,
      );
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      status: user.status,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
