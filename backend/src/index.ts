import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import groupRoutes from "./routes/groups";
import planRoutes from "./routes/plans";
import pollRoutes from "./routes/polls";
import expenseRoutes from "./routes/expenses";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

export const prisma = new PrismaClient();
const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "genout-backend" });
});
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/polls", pollRoutes);
app.use("/api/expenses", expenseRoutes);

app.use(errorHandler);

const port = process.env.PORT || 4000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// setup socket.io
import { Server as IOServer } from "socket.io";
const io = new IOServer(server, {
  cors: { origin: "*" }
});

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  socket.on('join', (room: string) => {
    socket.join(room);
  });
});

export { io };

