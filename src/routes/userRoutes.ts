import { Router } from "express";
import UserController from "../controllers/userController";
import AuthController from "../controllers/authController";
import FileUploadService from "../utils/fileUpload";

const router = Router();

const fileUploadService = new FileUploadService();


router.post("/", UserController.createUser);
router.get("/:username/users", AuthController.checkAuthMiddleware, UserController.getUserByUsername);
router.get("/", AuthController.checkAuthMiddleware, UserController.getUsers);
router.get("/me", AuthController.checkAuthMiddleware, UserController.getUser);
router.post("/update-profile", AuthController.checkAuthMiddleware, fileUploadService.getMulterMiddleware(), UserController.updateUser);


export default router;
