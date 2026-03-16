import { Request, Response } from "express";
import { prisma } from "../index";
import { z } from "zod";
import { io } from "../index";

export const createPoll = async (req: Request, res: Response) => {
  const schema = z.object({
    planId: z.number(),
    category: z.enum(["PLACE","TIME","ACTIVITY"]),
    options: z.array(z.string()).min(2),
  });
  const { planId, category, options } = schema.parse(req.body);

  const poll = await prisma.poll.create({
    data: {
      planId,
      category,
      options: {
        create: options.map((label, index) => ({ label, sortOrder: index })),
      },
    },
    include: { options: true },
  });

  io.to(`plan_${planId}`).emit('pollCreated', poll);
  res.json(poll);
};

export const addOption = async (req: Request, res: Response) => {
  const schema = z.object({ label: z.string(), sortOrder: z.number().optional() });
  const { label, sortOrder = 0 } = schema.parse(req.body);
  const pollId = parseInt(req.params.pollId);
  const option = await prisma.pollOption.create({ data: { pollId, label, sortOrder } });
  io.to(`poll_${pollId}`).emit('optionAdded', option);
  // also notify plan room in case UI is listening there
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (poll) {
    io.to(`plan_${poll.planId}`).emit('optionAdded', option);
  }
  res.json(option);
};

export const vote = async (req: Request, res: Response) => {
  const schema = z.object({ optionId: z.number() });
  const { optionId } = schema.parse(req.body);
  const pollId = parseInt(req.params.pollId);
  const userId = req.user.id;
  const vote = await prisma.vote.upsert({
    where: { pollId_userId: { pollId, userId } },
    update: { optionId },
    create: { pollId, optionId, userId }
  });
  io.to(`poll_${pollId}`).emit('vote', { pollId, optionId, userId });
  // also notify plan room
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (poll) {
    io.to(`plan_${poll.planId}`).emit('vote', { pollId, optionId, userId });
  }
  res.json(vote);
};
