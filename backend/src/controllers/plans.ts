import { Request, Response } from "express";
import { prisma } from "../index";
import { z } from "zod";

export const createPlan = async (req: Request, res: Response) => {
  const schema = z.object({ groupId: z.number(), title: z.string(), type: z.enum(["MOVIE","CAFE","NUKAD","OTHER"]) });
  const { groupId, title, type } = schema.parse(req.body);
  const createdBy = req.user.id;
  const plan = await prisma.plan.create({
    data: { groupId, title, type, createdBy }
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
    orderBy: { createdAt: 'desc' } as any,
    include: { expenses: true }
  });
  res.json(plans);
};

export const getHistory = async (req: Request, res: Response) => {
  // returns summary of past finalized plans the user has participated in
  const userId = req.user.id;
  const memberships = await prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } });
  const groupIds = memberships.map((m) => m.groupId);
  const plans = await prisma.plan.findMany({
    where: {
      groupId: { in: groupIds },
      status: 'FINALIZED'
    },
    orderBy: { createdAt: 'desc' } as any,
    include: { expenses: true }
  });

  const summary = plans.map((p: any) => {
    const totalExpense = (p.expenses || []).reduce((acc: number, e: any) => acc + e.amount, 0);
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      createdAt: p.createdAt,
      totalExpense
    };
  });
  res.json(summary);
};

import { computeSettlements } from "../services/settlement";

export const getPlan = async (req: Request, res: Response) => {
  const planId = parseInt(req.params.planId);
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      polls: { include: { options: true } },
      expenses: true,
      settlements: true
    }
  });
  res.json(plan);
};

export const finalizePlan = async (req: Request, res: Response) => {
  const schema = z.object({ planId: z.string() });
  const { planId } = schema.parse(req.params);
  const pid = parseInt(planId);
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
  const settlements = await prisma.settlement.findMany({ where: { planId: pid } });
  res.json(settlements);
};