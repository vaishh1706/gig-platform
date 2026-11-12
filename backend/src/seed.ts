import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./models/User";

async function seed() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const passwordHash = await bcrypt.hash("password123", 10);
  const workers = [
    { name: "Ravi Kumar", email: "ravi@example.com", category: "electrician", skills: ["wiring", "inverter", "fan repair"], ratePerHour: 350, city: "hyderabad" },
    { name: "Suresh Reddy", email: "suresh@example.com", category: "plumber", skills: ["pipe fitting", "leak repair", "bathroom"], ratePerHour: 300, city: "hyderabad" },
    { name: "Lakshmi Devi", email: "lakshmi@example.com", category: "carpenter", skills: ["furniture", "doors", "polish"], ratePerHour: 400, city: "warangal" },
    { name: "Imran Khan", email: "imran@example.com", category: "electrician", skills: ["wiring", "solar"], ratePerHour: 450, city: "secunderabad" },
  ];
  for (const w of workers) {
    await User.updateOne({ email: w.email }, { $setOnInsert: { ...w, role: "worker", passwordHash } }, { upsert: true });
  }
  await User.updateOne(
    { email: "customer@example.com" },
    { $setOnInsert: { name: "Demo Customer", email: "customer@example.com", role: "customer", city: "hyderabad", passwordHash } },
    { upsert: true }
  );
  console.log("Seeded demo users (password: password123)");
  await mongoose.disconnect();
}
seed();
