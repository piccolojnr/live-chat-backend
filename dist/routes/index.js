"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authRoutes_1 = __importDefault(require("./authRoutes"));
const userRoutes_1 = __importDefault(require("./userRoutes"));
const chatRoutes_1 = __importDefault(require("./chatRoutes"));
const redisClient_1 = __importDefault(require("../utils/redisClient"));
const db_1 = __importDefault(require("../utils/db"));
const authController_1 = __importDefault(require("../controllers/authController"));
const router = express_1.default.Router();
router.get("/", (req, res) => {
    res.json({
        message: "API is running"
    });
});
router.get("/status", async (req, res) => {
    const status = redisClient_1.default.isAlive();
    const dbStatus = db_1.default.isAlive();
    return res.json({
        redis: status,
        db: dbStatus ? "OK" : "Error"
    });
});
router.use("/auth", authRoutes_1.default);
router.use("/user", userRoutes_1.default);
router.use("/chat", authController_1.default.checkAuthMiddleware, chatRoutes_1.default);
exports.default = router;
