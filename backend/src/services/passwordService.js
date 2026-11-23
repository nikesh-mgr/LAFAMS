import bcrypt from "bcrypt";

// Cost factor for password hashing.
// Increase after performance testing when appropriate.
const SALT_ROUNDS = 12;
const MAX_PASSWORD_BYTES = 72;

/**
 * Validates password input before bcrypt operations.
 */
const validatePassword = (password) => {
  if (
    typeof password !== "string" ||
    password.length === 0 ||
    Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES
  ) {
    throw new TypeError("Password must contain between 1 and 72 UTF-8 bytes.");
  }
};

/**
 * Hashes a plain-text password before database storage.
 *
 * Never store or log the original password.
 */
export const hashPassword = async (password) => {
  validatePassword(password);

  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a supplied password with its stored hash.
 *
 * Returns false when the password does not match.
 */
export const comparePassword = async (password, passwordHash) => {
  if (typeof passwordHash !== "string" || passwordHash.length === 0) {
    return false;
  }

  try {
    validatePassword(password);
  } catch {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
};
