import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../index";
import { generateAccessToken, generateRefreshToken } from "../utils/auth";
import { z } from "zod";

/* =========================
   SIGNUP
========================= */
export const signup = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(6),
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues,
      });
    }

    const { name, email, password } = result.data;

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({
        message: "Email already in use",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   LOGIN
========================= */
export const login = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues,
      });
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const payload = {
      id: user.id,
      email: user.email,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   REFRESH TOKEN
========================= */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.sendStatus(401);
    }

    jwt.verify(
      token,
      process.env.REFRESH_TOKEN_SECRET as string,
      (err: any, user: any) => {
        if (err) {
          return res.sendStatus(403);
        }

        const payload = {
          id: user.id,
          email: user.email,
        };

        const accessToken = generateAccessToken(payload);

        res.json({ accessToken });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   LOGOUT
========================= */
export const logout = async (req: Request, res: Response) => {
  res.json({ message: "Logged out" });
};

/* =========================
   GET CURRENT USER
========================= */
export const me = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};