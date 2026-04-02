import { Request, Response } from "express";
import { prisma } from "../index";
import { z } from "zod";

export const createPlan = async (req: Request, res: Response) => {
  const schema = z.object({ groupId: z.number(), title: z.string(), type: z.enum(["MOVIE","CAFE","NUKAD","OTHER"]) });
  const { groupId, title, type } = schema.parse(req.body);
  const createdBy = req.user.id;
  const plan = await prisma.plan.create({
    data: { groupId, title, type, createdBy, status: "VOTING" }
  });
  res.json(plan);
};

export const listPlans = async (req: Request, res: Response) => {
  const schema = z.object({ groupId: z.string().optional(), page: z.string().optional(), size: z.string().optional() });
  const { groupId, page = "1", size = "10" } = schema.parse(req.query as any);
  const pageNum = parseInt(page);
  const sizeNum = parseInt(size);
  const where: any = {};
  if (groupId) where.groupId = parseInt(groupId);
  const plans = await prisma.plan.findMany({
    where,
    skip: (pageNum - 1) * sizeNum,
    take: sizeNum,
    orderBy: { createdAt: 'desc' },
    include: { expenses: true }
  });
  res.json(plans);
};

export const getPlanHistory = async (req: Request, res: Response) => {
  const userId = req.user.id;

  const plans = await prisma.plan.findMany({
    where: {
      group: {
        members: {
          some: { userId },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      expenses: {
        select: { amount: true },
      },
    },
  });

  const history = plans.map((plan) => ({
    id: plan.id,
    title: plan.title,
    status: plan.status,
    createdAt: plan.createdAt,
    totalExpense: plan.expenses.reduce((sum, expense) => sum + expense.amount, 0),
  }));

  res.json(history);
};

import { computeSettlements } from "../services/settlement";

export const getPlan = async (req: Request, res: Response) => {
  const planId = parseInt(req.params.planId);
  if (Number.isNaN(planId) || planId <= 0) {
    return res.status(400).json({ message: 'Invalid planId' });
  }

  const userId = req.user.id;

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      polls: { include: { options: { include: { votes: true } }, votes: true } },
      planVotes: true,
      expenses: { include: { payer: true, splits: true } },
      settlements: { include: { fromUser: true, toUser: true } },
      group: { include: { members: { include: { user: true } } } },
    }
  });

  if (!plan) {
    return res.status(404).json({ message: 'Plan not found' });
  }

  const voteSummary = (plan.planVotes ?? []).reduce(
    (acc, vote) => {
      if (vote.value === "YES") acc.yesCount += 1;
      if (vote.value === "NO") acc.noCount += 1;
      if (vote.userId === userId) acc.myVote = vote.value;
      return acc;
    },
    { yesCount: 0, noCount: 0, myVote: null as "YES" | "NO" | null }
  );

  res.json({ ...plan, voteSummary });
};

export const voteOnPlan = async (req: Request, res: Response) => {
  const schema = z.object({ value: z.enum(["YES", "NO"]) });
  const { value } = schema.parse(req.body);

  const planId = parseInt(req.params.planId);
  if (Number.isNaN(planId) || planId <= 0) {
    return res.status(400).json({ message: 'Invalid planId' });
  }

  const userId = req.user.id;

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return res.status(404).json({ message: "Plan not found" });

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: plan.groupId, userId } },
  });
  if (!membership) {
    return res.status(403).json({ message: "Not authorized to vote on this plan" });
  }

  const planVote = await prisma.planVote.upsert({
    where: { planId_userId: { planId, userId } },
    update: { value },
    create: { planId, userId, value },
  });

  res.json(planVote);
};

export const deletePlan = async (req: Request, res: Response) => {
  const planId = parseInt(req.params.planId);
  if (Number.isNaN(planId) || planId <= 0) {
    return res.status(400).json({ message: 'Invalid planId' });
  }

  const userId = req.user.id;

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return res.status(404).json({ message: "Plan not found" });

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: plan.groupId, userId } },
  });

  if (!membership || (membership.role !== "OWNER" && plan.createdBy !== userId)) {
    return res.status(403).json({ message: "Not authorized" });
  }

  // delete dependent records in correct order
  const polls = await prisma.poll.findMany({ where: { planId }, select: { id: true } });
  const pollIds = polls.map((p) => p.id);

  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { pollId: { in: pollIds } } }),
    prisma.pollOption.deleteMany({ where: { pollId: { in: pollIds } } }),
    prisma.poll.deleteMany({ where: { id: { in: pollIds } } }),
    prisma.planVote.deleteMany({ where: { planId } }),
    prisma.settlement.deleteMany({ where: { planId } }),
    prisma.expenseSplit.deleteMany({ where: { expense: { planId } } }),
    prisma.expense.deleteMany({ where: { planId } }),
    prisma.plan.delete({ where: { id: planId } }),
  ]);

  res.json({ message: "Plan deleted" });
};

export const finalizePlan = async (req: Request, res: Response) => {
  const schema = z.object({ planId: z.string() });
  const { planId } = schema.parse(req.params);
  const pid = parseInt(planId);
  if (Number.isNaN(pid) || pid <= 0) {
    return res.status(400).json({ message: 'Invalid planId' });
  }

  const plan = await prisma.plan.findUnique({ where: { id: pid }, include: { polls: { include: { options: true, votes: true } } } });
  if (!plan) return res.status(404).json({ message: "Plan not found" });
  // Only owner or creator can finalize
  const userId = req.user.id;
  const group = await prisma.group.findUnique({ where: { id: plan.groupId } });
  if (!group) return res.status(404).json({ message: "Group not found" });
  const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: group.id, userId } } });
  if (!membership || (membership.role !== "OWNER" && plan.createdBy !== userId)) {
    return res.status(403).json({ message: "Not authorized" });
  }

  // calculate winners for each category
  const results: any = {};
  for (let poll of plan.polls) {
    const counts: Record<number, number> = {};
    for (let vote of await prisma.vote.findMany({ where: { pollId: poll.id } })) {
      counts[vote.optionId] = (counts[vote.optionId] || 0) + 1;
    }
    // pick max, tie-break using sortOrder
    let winnerId: number | null = null;
    let maxCount = -1;
    let bestSort = Number.MAX_SAFE_INTEGER;
    for (let opt of poll.options) {
      const c = counts[opt.id] || 0;
      if (c > maxCount || (c === maxCount && opt.sortOrder < bestSort)) {
        maxCount = c;
        bestSort = opt.sortOrder;
        winnerId = opt.id;
      }
    }
    if (winnerId != null) {
      const chosen = poll.options.find((o: any) => o.id === winnerId);
      if (poll.category === "PLACE") results.finalPlace = chosen?.label;
      if (poll.category === "TIME") results.finalTime = chosen?.label; // storing label string for simplicity
      if (poll.category === "ACTIVITY") results.finalActivity = chosen?.label;
    }
    // close poll
    await prisma.poll.update({ where: { id: poll.id }, data: { isOpen: false } });
  }

  const updatedPlan = await prisma.plan.update({
    where: { id: pid },
    data: { status: "FINALIZED", ...results }
  });

  // compute settlements
  await computeSettlements(pid);

  res.json(updatedPlan);
};
export const getSettlements = async (req: Request, res: Response) => {
  const schema = z.object({ planId: z.string() });
  const { planId } = schema.parse(req.params);
  const pid = parseInt(planId);
  if (Number.isNaN(pid) || pid <= 0) {
    return res.status(400).json({ message: 'Invalid planId' });
  }
  const settlements = await prisma.settlement.findMany({ where: { planId: pid } });
  res.json(settlements);
};
