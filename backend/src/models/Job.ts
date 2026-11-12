import { Schema, model } from "mongoose";
import { CATEGORIES } from "./User";

const jobSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    category: { type: String, enum: CATEGORIES, required: true },
    city: { type: String, required: true, trim: true, lowercase: true },
    budget: { type: Number, required: true, min: 0 }, // max rate per hour the customer will pay
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["open", "assigned", "completed"], default: "open" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    applicants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // cooperative job sharing: an assigned worker hands the job back to the pool
    sharedToPool: { type: Boolean, default: false },
    sharedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const Job = model("Job", jobSchema);
