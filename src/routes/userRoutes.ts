import { Router } from "express";
import UserController from "../controllers/userController";

const router = Router();

router.post("/user", UserController.createUser);
router.get("/user/:username", UserController.getUser);

export default router;
