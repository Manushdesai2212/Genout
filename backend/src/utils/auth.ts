import jwt from "jsonwebtoken";

export const generateAccessToken = (user: any) => {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: "15m" });
};

export const generateRefreshToken = (user: any) => {
  return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: "7d" });
};
