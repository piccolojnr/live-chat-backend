import { Router } from "express";
import UserController from "../controllers/userController";
import AuthController from "../controllers/authController";

const router = Router();

router.post("/", UserController.createUser);
router.get("/:username/users", AuthController.checkAuthMiddleware, UserController.getUserByUsername);
router.get("/", AuthController.checkAuthMiddleware, UserController.getUsers);
router.get("/me", AuthController.checkAuthMiddleware, UserController.getUser);

export default router;
