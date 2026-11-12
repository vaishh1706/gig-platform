import { Router } from "express";
import { User } from "../models/User";

const router = Router();

/** Smart matching score, 0-100: category 40, skills 30, location 20, budget 10. */
export function scoreWorker(
  w: { category?: string | null; skills: string[]; city?: string | null; ratePerHour?: number | null },
  q: { category?: string; skills: string[]; city?: string; budget?: number }
) {
  let score = 0;
  if (q.category && w.category === q.category) score += 40;
  if (q.skills.length) {
    const have = new Set(w.skills.map((s) => s.toLowerCase()));
    const hits = q.skills.filter((s) => have.has(s)).length;
    score += Math.round((hits / q.skills.length) * 30);
  } else {
    score += 15; // no skills asked for: neutral
  }
  if (q.city && w.city === q.city) score += 20;
  if (q.budget === undefined || (w.ratePerHour ?? 0) <= q.budget) score += 10;
  return score;
}

// GET /api/workers/match?category=plumber&skills=pipe,leak&city=hyderabad&budget=400
router.get("/match", async (req, res) => {
  const category = req.query.category ? String(req.query.category) : undefined;
  const city = req.query.city ? String(req.query.city).trim().toLowerCase() : undefined;
  const budget = req.query.budget !== undefined && req.query.budget !== "" ? Number(req.query.budget) : undefined;
  const skills = String(req.query.skills || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

  const workers = await User.find({ role: "worker", available: true }).select("-passwordHash -__v");
  const ranked = workers
    .map((w) => ({ worker: w, score: scoreWorker(w as any, { category, skills, city, budget }) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  res.json(ranked);
});

export default router;
