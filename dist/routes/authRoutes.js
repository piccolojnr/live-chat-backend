"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = __importDefault(require("../controllers/authController"));
const router = (0, express_1.Router)();
router.post('/connect', authController_1.default.getConnect);
router.get('/', authController_1.default.auth);
router.post('/disconnect', authController_1.default.getDisconnect);
exports.default = router;
