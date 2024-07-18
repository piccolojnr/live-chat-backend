import { Router } from "express";
import ChatController from "../controllers/chatController";

const router = Router();

router.post("", ChatController.createChat);
router.get("/:id", ChatController.getChat);
router.get("", ChatController.getChats);
router.put("/:id", ChatController.updateChat);
router.delete("/:id", ChatController.deleteChat);
router.get("/:id/messages", ChatController.getChatMessages);
router.post("/:id/messages", ChatController.addChatMessage);

export default router;
