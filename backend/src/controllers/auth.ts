import { Request, Response } from "express";
import bcrypt from 'bcryptjs'
import jwt from "jsonwebtoken";
import { prisma } from "../index";
import { generateAccessToken, generateRefreshToken } from "../utils/auth";

import { z } from "zod";

export const signup = async (req: Request, res: Response) => {
  const schema = z.object({ name: z.string(), email: z.string().email(), password: z.string().min(6) });
  const { name, email, password } = schema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ message: "Email already in use" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });
  res.json({ id: user.id, name: user.name, email: user.email });
};

export const login = async (req: Request, res: Response) => {
  const schema = z.object({ email: z.string().email(), password: z.string() });
  const { email, password } = schema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ message: "Invalid credentials" });
  const payload = { id: user.id, email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  res.json({ accessToken, refreshToken });
};

export const refreshToken = async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    const payload = { id: user.id, email: user.email };
    const accessToken = generateAccessToken(payload);
    res.json({ accessToken });
  });
};

export const logout = async (req: Request, res: Response) => {
  // handle token invalidation with blacklist if needed
  res.json({ message: "Logged out" });
};

export const me = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json(user);
};
