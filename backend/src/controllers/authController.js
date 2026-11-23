import { authenticateUser } from "../services/authService.js";
import { AppError } from "../utils/appError.js";

/**
 * Creates a new session after successful authentication.
 *
 * Regenerating the session ID prevents session fixation.
 */
const regenerateSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

/**
 * Persists the session before sending the response.
 */
const saveSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

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
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.validated.body;

    const user = await authenticateUser({
      username,
      password,
    });

    await regenerateSession(req);

    // Store only the identity and session version
    // required by authentication middleware.
    req.session.user = {
      id: user.id,
      role: user.role,
      sessionVersion: user.sessionVersion,
    };

    await saveSession(req);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    if (!req.session) {
      throw new AppError("No active session was found.", 401);
    }

    await destroySession(req);

    res.clearCookie("lafams.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    return next(error);
  }
};
