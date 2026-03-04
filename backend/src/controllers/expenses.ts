import { Request, Response } from "express";
import { prisma, io } from "../index";
import { z } from "zod";

export const addExpense = async (req: Request, res: Response) => {
  const schema = z.object({
    planId: z.number(),
    amount: z.number(),
    currency: z.string().optional(),
    category: z.string(),
    note: z.string().optional(),
    splitType: z.enum(["equal","custom","selected"]).optional(),
    participants: z.array(z.number()).optional(),
    customShares: z.array(z.object({ userId: z.number(), shareAmount: z.number() })).optional(),
  });
  const {
    planId,
    amount,
    currency = "INR",
    category,
    note,
    splitType = "equal",
    participants,
    customShares,
  } = schema.parse(req.body);
  const paidBy = req.user.id;

  // compute splits
  let splitsData: { userId: number; shareAmount: number }[] = [];

  const members = await prisma.groupMember.findMany({
    where: { groupId: (await prisma.plan.findUnique({ where: { id: planId } }))!.groupId }
  });
  const memberIds = members.map(m => m.userId);

  if (splitType === "equal") {
    const share = amount / memberIds.length;
    splitsData = memberIds.map((uid: number) => ({ userId: uid, shareAmount: share }));
  } else if (splitType === "selected") {
    // participants array of ids
    if (!participants || participants.length === 0) {
      return res.status(400).json({ message: "Participants required for selected split" });
    }
    const share = amount / participants.length;
    splitsData = participants.map((uid: number) => ({ userId: uid, shareAmount: share }));
  } else if (splitType === "custom") {
    // customShares: {userId, shareAmount}[] expected
    if (!customShares || customShares.length === 0) {
      return res.status(400).json({ message: "Custom shares required for custom split" });
    }
    splitsData = customShares;
    const total = splitsData.reduce((a, b) => a + b.shareAmount, 0);
    if (Math.abs(total - amount) > 0.01) {
      return res.status(400).json({ message: "Custom shares must sum to total amount" });
    }
  }

  const expense = await prisma.expense.create({
    data: {
      planId,
      amount,
      currency,
      category,
      note,
      paidBy,
      splits: {
        create: splitsData,
      },
    },
    include: { splits: true },
  });
  io.to(`plan_${planId}`).emit('expenseAdded', expense);
  res.json(expense);
};

export const getExpenses = async (req: Request, res: Response) => {
  const planId = parseInt(req.params.planId);
  const expenses = await prisma.expense.findMany({
    where: { planId },
    include: { splits: true, payer: true }
  });
  res.json(expenses);
};
