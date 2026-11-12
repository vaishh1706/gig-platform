import { Router } from "express";
import { Job } from "../models/Job";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const populate = [
  { path: "customer", select: "name city phone" },
  { path: "assignedTo", select: "name category phone" },
  { path: "applicants", select: "name category skills ratePerHour" },
];

// Customer posts a job
router.post("/", requireRole("customer"), async (req: AuthRequest, res) => {
  try {
    const { title, description, category, city, budget } = req.body;
    const job = await Job.create({ title, description, category, city, budget: Number(budget), customer: req.user!.id });
    res.status(201).json(job);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Open jobs board (workers can filter by category/city)
router.get("/", async (req, res) => {
  const filter: Record<string, unknown> = { status: "open", sharedToPool: false };
  if (req.query.category) filter.category = String(req.query.category);
  if (req.query.city) filter.city = String(req.query.city).trim().toLowerCase();
  res.json(await Job.find(filter).sort({ createdAt: -1 }).populate(populate));
});

// Jobs that belong to me (customer: posted, worker: assigned or applied)
router.get("/mine", async (req: AuthRequest, res) => {
  const me = req.user!;
  const filter =
    me.role === "customer"
      ? { customer: me.id }
      : { $or: [{ assignedTo: me.id }, { applicants: me.id }] };
  res.json(await Job.find(filter).sort({ createdAt: -1 }).populate(populate));
});

// Cooperative pool: jobs shared by workers that any worker can take over
router.get("/shared", requireRole("worker"), async (_req, res) => {
  res.json(await Job.find({ sharedToPool: true, status: "assigned" }).sort({ updatedAt: -1 }).populate(populate));
});

// Worker applies to an open job
router.post("/:id/apply", requireRole("worker"), async (req: AuthRequest, res) => {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, status: "open" },
    { $addToSet: { applicants: req.user!.id } },
    { new: true }
  );
  if (!job) return res.status(404).json({ error: "This job is no longer open" });
  res.json(job);
});

// Customer picks a worker from the applicants
router.post("/:id/assign", requireRole("customer"), async (req: AuthRequest, res) => {
  const job = await Job.findOne({ _id: req.params.id, customer: req.user!.id, status: "open" });
  if (!job) return res.status(404).json({ error: "Job not found or already assigned" });
  const workerId = String(req.body.workerId);
  if (!job.applicants.some((a) => String(a) === workerId)) {
    return res.status(400).json({ error: "That worker has not applied to this job" });
  }
  job.assignedTo = workerId as any;
  job.status = "assigned";
  await job.save();
  res.json(job);
});

// Assigned worker shares the job with the cooperative
router.post("/:id/share", requireRole("worker"), async (req: AuthRequest, res) => {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, assignedTo: req.user!.id, status: "assigned" },
    { sharedToPool: true, sharedBy: req.user!.id },
    { new: true }
  );
  if (!job) return res.status(404).json({ error: "You can only share jobs assigned to you" });
  res.json(job);
});

// Another worker claims a shared job
router.post("/:id/claim", requireRole("worker"), async (req: AuthRequest, res) => {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, sharedToPool: true, status: "assigned", sharedBy: { $ne: req.user!.id } },
    { assignedTo: req.user!.id, sharedToPool: false, sharedBy: null },
    { new: true }
  );
  if (!job) return res.status(404).json({ error: "This job is not available to claim" });
  res.json(job);
});

// Customer marks the job done
router.post("/:id/complete", requireRole("customer"), async (req: AuthRequest, res) => {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, customer: req.user!.id, status: "assigned" },
    { status: "completed", sharedToPool: false },
    { new: true }
  );
  if (!job) return res.status(404).json({ error: "Job not found or not assigned yet" });
  res.json(job);
});

export default router;
