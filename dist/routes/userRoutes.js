"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = __importDefault(require("../controllers/userController"));
const authController_1 = __importDefault(require("../controllers/authController"));
const router = (0, express_1.Router)();
router.post("/", userController_1.default.createUser);
router.get("/:username/users", authController_1.default.checkAuthMiddleware, userController_1.default.getUserByUsername);
router.get("/", authController_1.default.checkAuthMiddleware, userController_1.default.getUsers);
router.get("/me", authController_1.default.checkAuthMiddleware, userController_1.default.getUser);
exports.default = router;
