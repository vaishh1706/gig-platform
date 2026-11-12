import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import authRoutes from "./routes/auth";
import workerRoutes from "./routes/workers";
import jobRoutes from "./routes/jobs";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/jobs", jobRoutes);
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Serve the frontend from the same server
app.use(express.static(path.join(__dirname, "../../frontend")));

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
    throw new Error("Set MONGO_URI and JWT_SECRET in backend/.env (see .env.example)");
  }
  await mongoose.connect(process.env.MONGO_URI);
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
