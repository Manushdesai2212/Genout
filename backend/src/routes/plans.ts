import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as planController from "../controllers/plans";

const router = Router();

router.post("/", authenticateToken, planController.createPlan);
router.get("/", authenticateToken, planController.listPlans);
router.get("/history", authenticateToken, planController.getHistory);
router.get("/:planId", authenticateToken, planController.getPlan);
router.post("/:planId/finalize", authenticateToken, planController.finalizePlan);
router.get("/:planId/settlements", authenticateToken, planController.getSettlements);

export default router;
