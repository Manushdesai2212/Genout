import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as groupController from "../controllers/groups";

const router = Router();

router.post("/create", authenticateToken, groupController.createGroup);
router.post("/join", authenticateToken, groupController.joinGroup);
router.get("/", authenticateToken, groupController.listGroups);
router.get("/:groupId", authenticateToken, groupController.getGroup);
router.get("/:groupId/members", authenticateToken, groupController.getMembers);
router.delete("/:groupId", authenticateToken, groupController.deleteGroup);

export default router;
