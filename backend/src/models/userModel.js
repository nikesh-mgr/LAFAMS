import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const usernamePattern =
  /^(?:[a-z0-9._-]{3,30}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})$/;

const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
      required: function () {
        return this.role === "ADMIN";
      },
    },

    username: {
      type: String,
      required: [true, "Username is required."],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [usernamePattern, "Enter a valid username or email address."],
    },

    password: {
      type: String,
      required: [true, "Password is required."],
      select: false,
    },

    role: {
      type: String,
      required: true,
      enum: ["ADMIN", "STAFF", "CUSTOMER"],
    },

    status: {
      type: String,
      required: true,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    // Increment to invalidate all existing login sessions.
    sessionVersion: {
      type: Number,
      default: 0,
      min: [0, "Session version cannot be negative."],
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,

    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    },

    toObject: {
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  },
);

// Enforce one Admin account at database level.
userSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: "ADMIN",
    },
    name: "one_admin_account",
  },
);

export const User = models.User || model("User", userSchema);
