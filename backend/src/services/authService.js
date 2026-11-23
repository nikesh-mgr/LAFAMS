import { User } from "../models/userModel.js";
import { comparePassword } from "./passwordService.js";
import { AppError } from "../utils/appError.js";

/**
 * Authenticate a user using username and password.
 *
 * Returns safe user information required by the
 * authentication controller to establish a session.
 */
export const authenticateUser = async ({ username, password }) => {
  const normalizedUsername = username.trim().toLowerCase();

  const user = await User.findOne({
    username: normalizedUsername,
  }).select("+password");

  if (!user) {
    throw new AppError("Invalid username or password.", 401);
  }

  const passwordMatches = await comparePassword(password, user.password);

  if (!passwordMatches) {
    throw new AppError("Invalid username or password.", 401);
  }

  if (user.status !== "ACTIVE") {
    throw new AppError("This account is inactive.", 403);
  }

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      status: "ACTIVE",
    },
    {
      $set: {
        lastLoginAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).select("_id name username role status lastLoginAt sessionVersion");

  if (!updatedUser) {
    throw new AppError("This account is inactive.", 403);
  }

  return {
    id: updatedUser._id.toString(),
    name: updatedUser.name,
    username: updatedUser.username,
    role: updatedUser.role,
    status: updatedUser.status,
    lastLoginAt: updatedUser.lastLoginAt,

    // Used by authController to establish a versioned session.
    sessionVersion: updatedUser.sessionVersion ?? 0,
  };
};
