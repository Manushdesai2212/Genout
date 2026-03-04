import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as expenseController from "../controllers/expenses";

const router = Router();

router.post("/", authenticateToken, expenseController.addExpense);
router.get("/plan/:planId", authenticateToken, expenseController.getExpenses);

export default router;
