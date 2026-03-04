import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as pollController from "../controllers/polls";

const router = Router();

router.post("/", authenticateToken, pollController.createPoll);
router.post("/:pollId/options", authenticateToken, pollController.addOption);
router.post("/:pollId/vote", authenticateToken, pollController.vote);

export default router;
