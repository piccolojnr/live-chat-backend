import { Router } from "express";
import UserController from "../controllers/userController";

const router = Router();

router.post("/user", UserController.createUser);
router.get("/user/:username", UserController.getUser);
router.get("/users", UserController.getUsers);
router.put("/user/:username", UserController.updateUser);
router.delete("/user/:username", UserController.deleteUser);

export default router;
