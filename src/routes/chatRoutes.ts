import { Router } from "express";
import ChatController from "../controllers/chatController";


const router = Router();

router.post("", ChatController.createChat);
router.get("/:id", ChatController.getChat);
router.get("/", ChatController.getChats);
router.put("/:id", ChatController.addMessage);

export default router;
