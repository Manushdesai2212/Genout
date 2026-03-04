import { prisma } from "../index";

/**
 * Compute minimal settlements given a plan id. This returns an array of {from, to, amount}
 */
export const computeSettlements = async (planId: number) => {
  // fetch expenses, splits, users involved
  const expenses = await prisma.expense.findMany({
    where: { planId },
    include: { splits: true }
  });

  const balanceMap: Record<number, number> = {};

  // initialize balances
  for (let exp of expenses) {
    balanceMap[exp.paidBy] = (balanceMap[exp.paidBy] || 0) + exp.amount;
    for (let split of exp.splits) {
      balanceMap[split.userId] = (balanceMap[split.userId] || 0) - split.shareAmount;
    }
  }

  const creditors: { userId: number; amount: number }[] = [];
  const debtors: { userId: number; amount: number }[] = [];
  for (const [userIdStr, bal] of Object.entries(balanceMap)) {
    const userId = parseInt(userIdStr);
    if (bal > 0) creditors.push({ userId, amount: bal });
    else if (bal < 0) debtors.push({ userId, amount: -bal });
  }

  const settlements: { fromUserId: number; toUserId: number; amount: number }[] = [];

  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debt = debtors[i];
    const cred = creditors[j];
    const amt = Math.min(debt.amount, cred.amount);
    settlements.push({ fromUserId: debt.userId, toUserId: cred.userId, amount: amt });
    debt.amount -= amt;
    cred.amount -= amt;
    if (debt.amount === 0) i++;
    if (cred.amount === 0) j++;
  }

  // persist into DB
  await prisma.settlement.deleteMany({ where: { planId } });
  for (let s of settlements) {
    await prisma.settlement.create({
      data: { planId, fromUserId: s.fromUserId, toUserId: s.toUserId, amount: s.amount }
    });
  }

  return settlements;
};
