import "dotenv/config";

import readline from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";

import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/userModel.js";
import { hashPassword } from "../services/passwordService.js";

// ============================================
// Configuration
// ============================================

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72;

// ============================================
// Normal Terminal Input
// ============================================

const askQuestion = async (rl, question) => {
  const answer = await rl.question(question);
  return answer.trim();
};

// ============================================
// Hidden Password Input
// ============================================

/**
 * Reads password input without displaying the actual password.
 * Displays asterisks as visual feedback.
 */
const askHiddenPassword = (question) =>
  new Promise((resolve, reject) => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(
        new Error(
          "Interactive terminal required. Run this command directly in PowerShell.",
        ),
      );
      return;
    }

    let password = "";
    let completed = false;

    const cleanup = () => {
      stdin.removeListener("keypress", handleKeypress);

      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }

      stdin.pause();
    };

    const handleKeypress = (character, key = {}) => {
      if (completed) return;

      // Ctrl+C cancels password input.
      if (key.ctrl && key.name === "c") {
        completed = true;
        cleanup();
        stdout.write("\n");
        reject(new Error("Admin bootstrap cancelled."));
        return;
      }

      // Enter submits the password.
      if (key.name === "return" || key.name === "enter") {
        completed = true;
        cleanup();
        stdout.write("\n");
        resolve(password);
        return;
      }

      // Backspace removes the last character.
      if (key.name === "backspace" || key.name === "delete") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          stdout.write("\b \b");
        }
        return;
      }

      // Accept printable characters.
      if (
        typeof character === "string" &&
        character.length > 0 &&
        !key.ctrl &&
        !key.meta &&
        character >= " "
      ) {
        password += character;
        stdout.write("*");
      }
    };

    try {
      stdout.write(question);

      emitKeypressEvents(stdin);
      stdin.setRawMode(true);
      stdin.resume();

      stdin.on("keypress", handleKeypress);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });

// ============================================
// Validation
// ============================================

const validateName = (name) => {
  const normalizedName = name.trim();

  if (normalizedName.length < 2 || normalizedName.length > 100) {
    throw new Error("Full name must contain 2–100 characters.");
  }

  return normalizedName;
};

const validateUsername = (username) => {
  const normalizedUsername = username.trim().toLowerCase();

  const usernamePattern =
    /^(?:[a-z0-9._-]{3,30}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})$/;

  if (!usernamePattern.test(normalizedUsername)) {
    throw new Error("Enter a valid username or email address.");
  }

  return normalizedUsername;
};

const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    throw new Error(
      `Password cannot exceed ${MAX_PASSWORD_BYTES} UTF-8 bytes.`,
    );
  }
};

// ============================================
// Bootstrap Admin
// ============================================

const bootstrapAdmin = async () => {
  let rl;

  try {
    console.log("\n========== LAFAms Admin Bootstrap ==========\n");

    // 1. Connect to MongoDB.
    await connectDB();

    console.log("MongoDB connected successfully.");

    // 2. Ensure database indexes exist.
    await User.init();

    // 3. Check whether an Admin already exists.
    const existingAdmin = await User.exists({
      role: "ADMIN",
    });

    if (existingAdmin) {
      throw new Error(
        "An Admin account already exists. Bootstrap is only allowed once.",
      );
    }

    // 4. Collect Admin details.
    rl = readline.createInterface({
      input: stdin,
      output: stdout,
    });

    const nameInput = await askQuestion(rl, "Enter Admin full name: ");

    const name = validateName(nameInput);

    const usernameInput = await askQuestion(
      rl,
      "Enter Admin login username/email: ",
    );

    const username = validateUsername(usernameInput);

    // Close normal input before hidden password input.
    rl.close();
    rl = null;

    // 5. Read password securely.
    const password = await askHiddenPassword(
      "Enter Admin password (hidden, * shown): ",
    );

    validatePassword(password);

    const confirmPassword = await askHiddenPassword(
      "Confirm Admin password (hidden, * shown): ",
    );

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    // 6. Hash password before saving.
    const passwordHash = await hashPassword(password);

    // 7. Create Admin account.
    const admin = await User.create({
      name,
      username,
      password: passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      createdBy: null,
    });

    // 8. Display safe account information.
    console.log("\nAdmin account created successfully.");
    console.log("------------------------------------------");
    console.log(`Name      : ${admin.name}`);
    console.log(`Username  : ${admin.username}`);
    console.log(`Account ID: ${admin._id}`);
    console.log(`Role      : ${admin.role}`);
    console.log(`Status    : ${admin.status}`);
    console.log("------------------------------------------");
    console.log("\nYou can now log in to LAFAms.");
  } catch (error) {
    if (error.code === 11000) {
      console.error(
        "\nBootstrap failed: An Admin or duplicate username already exists.",
      );
    } else {
      console.error("\nAdmin bootstrap failed:", error.message);
    }

    process.exitCode = 1;
  } finally {
    rl?.close();

    await disconnectDB().catch((error) => {
      console.error("MongoDB disconnection failed:", error.message);

      process.exitCode = 1;
    });
  }
};

// ============================================
// Execute
// ============================================

bootstrapAdmin();
