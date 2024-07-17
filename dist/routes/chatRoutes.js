"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = __importDefault(require("../controllers/chatController"));
const router = (0, express_1.Router)();
router.post("", chatController_1.default.createChat);
router.get("/:id", chatController_1.default.getChat);
router.get("", chatController_1.default.getChats);
router.put("/:id", chatController_1.default.updateChat);
router.delete("/:id", chatController_1.default.deleteChat);
router.get("/:id/messages", chatController_1.default.getChatMessages);
router.post("/:id/messages", chatController_1.default.addChatMessage);
exports.default = router;
