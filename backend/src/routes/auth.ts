import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

function sign(id: string, role: string) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
}

function publicUser(u: any) {
  const { passwordHash, __v, ...rest } = u.toObject();
  return rest;
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, phone, city, category, skills, ratePerHour, bio } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Name, email, password and role are required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    if (await User.findOne({ email: String(email).toLowerCase() })) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const user = await User.create({
      name, email, role, phone, city,
      passwordHash: await bcrypt.hash(password, 10),
      ...(role === "worker"
        ? {
            category,
            skills: Array.isArray(skills)
              ? skills
              : String(skills || "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean),
            ratePerHour: Number(ratePerHour) || 0,
            bio,
          }
        : {}),
    });
    res.status(201).json({ token: sign(user.id, user.role), user: publicUser(user) });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || "").toLowerCase() });
  if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) {
    return res.status(401).json({ error: "Email or password is incorrect" });
  }
  res.json({ token: sign(user.id, user.role), user: publicUser(user) });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: "Account not found" });
  res.json({ user: publicUser(user) });
});

export default router;
