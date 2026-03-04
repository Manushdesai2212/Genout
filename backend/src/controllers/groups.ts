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
