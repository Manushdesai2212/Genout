import { Router } from "express";
import { signup, login, logout, me, refreshToken } from "../controllers/auth";
import { authenticateToken } from "../middleware/auth";


const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", authenticateToken, logout);
router.get("/me", authenticateToken, me);

router.get("/me", authenticateToken, me);


export default router;
