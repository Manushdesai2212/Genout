import { Request, Response } from "express";
import { prisma } from "../index";
import { nanoid } from "nanoid";

import { z } from "zod";

export const createGroup = async (req: Request, res: Response) => {
  const schema = z.object({ name: z.string().min(1) });
  const { name } = schema.parse(req.body);
  const ownerId = req.user.id;
  const inviteCode = nanoid(8);
  const group = await prisma.group.create({
    data: {
      name,
      ownerId,
      inviteCode,
      members: {
        create: { userId: ownerId, role: "OWNER" }
      }
    }
  });
  res.json(group);
};

export const joinGroup = async (req: Request, res: Response) => {
  const schema = z.object({ code: z.string().min(1) });
  const { code } = schema.parse(req.body);
  const userId = req.user.id;
  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group) return res.status(404).json({ message: "Group not found" });
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId } },
    update: {},
    create: { groupId: group.id, userId, role: "MEMBER" }
  });
  res.json({ message: "Joined" });
};

export const listGroups = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: true }
  });
  res.json(memberships.map((m: any) => m.group));
};

export const getGroup = async (req: Request, res: Response) => {
  const groupId = parseInt(req.params.groupId);
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: true } }, plans: true }
  });
  res.json(group);
};

export const getMembers = async (req: Request, res: Response) => {
  const groupId = parseInt(req.params.groupId);
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: true }
  });
  res.json(members);
};

export const deleteGroup = async (req: Request, res: Response) => {
  const groupId = parseInt(req.params.groupId);
  const userId = req.user.id;

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return res.status(404).json({ message: "Group not found" });

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } }
  });
  if (!membership || membership.role !== "OWNER") {
    return res.status(403).json({ message: "Not authorized" });
  }

  // delete all related data (plans, expenses, polls, settlements, memberships)
  const plans = await prisma.plan.findMany({ where: { groupId }, select: { id: true } });
  const planIds = plans.map((p) => p.id);

  if (planIds.length > 0) {
    const expenses = await prisma.expense.findMany({ where: { planId: { in: planIds } }, select: { id: true } });
    const expenseIds = expenses.map((e) => e.id);

    const polls = await prisma.poll.findMany({ where: { planId: { in: planIds } }, select: { id: true } });
    const pollIds = polls.map((p) => p.id);

    await prisma.$transaction(async (tx) => {
      await tx.settlement.deleteMany({ where: { planId: { in: planIds } } });

      if (pollIds.length) {
        await tx.vote.deleteMany({ where: { pollId: { in: pollIds } } });
        await tx.pollOption.deleteMany({ where: { pollId: { in: pollIds } } });
        await tx.poll.deleteMany({ where: { id: { in: pollIds } } });
      }

      if (expenseIds.length) {
        await tx.expenseSplit.deleteMany({ where: { expenseId: { in: expenseIds } } });
        await tx.expense.deleteMany({ where: { id: { in: expenseIds } } });
      }

      await tx.planVote.deleteMany({ where: { planId: { in: planIds } } });
      await tx.plan.deleteMany({ where: { id: { in: planIds } } });

      await tx.groupMember.deleteMany({ where: { groupId } });
      await tx.group.delete({ where: { id: groupId } });
    });

    return res.json({ message: "Group deleted" });
  }

  // If there are no plans, just delete members + group
  await prisma.$transaction(async (tx) => {
    await tx.groupMember.deleteMany({ where: { groupId } });
    await tx.group.delete({ where: { id: groupId } });
  });

  return res.json({ message: "Group deleted" });
};
