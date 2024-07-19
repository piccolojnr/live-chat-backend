import { Router } from "express";
import MessageController from "../controllers/messageController";

const router = Router();

router.get("/:id", MessageController.getMessages);

export default router;