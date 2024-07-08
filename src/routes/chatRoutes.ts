import { Router } from "express";
import ChatController from "../controllers/chatController";


const router = Router();

router.post("/chat", ChatController.createChat);
router.get("/chat/:id", ChatController.getChat);
router.get("/chat", ChatController.getChats);
router.put("/chat/:id", ChatController.addMessage);

export default router;