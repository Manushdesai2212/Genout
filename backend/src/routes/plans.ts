import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as planController from "../controllers/plans";

const router = Router();

router.post("/", authenticateToken, planController.createPlan);
router.get("/", authenticateToken, planController.listPlans);
router.get("/history", authenticateToken, planController.getPlanHistory);
router.get("/:planId", authenticateToken, planController.getPlan);
router.post("/:planId/vote", authenticateToken, planController.voteOnPlan);
router.post("/:planId/finalize", authenticateToken, planController.finalizePlan);
router.delete("/:planId", authenticateToken, planController.deletePlan);
router.get("/:planId/settlements", authenticateToken, planController.getSettlements);

export default router;
