import { Schema, model } from "mongoose";

export const CATEGORIES = [
  "electrician", "plumber", "carpenter", "painter", "mason",
  "mechanic", "cleaner", "gardener", "cook", "other",
] as const;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["customer", "worker"], required: true },
    phone: { type: String, trim: true },
    city: { type: String, trim: true, lowercase: true },
    // worker-only fields
    category: { type: String, enum: CATEGORIES },
    skills: { type: [String], default: [] },
    ratePerHour: { type: Number, min: 0 },
    bio: { type: String, maxlength: 500 },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = model("User", userSchema);
