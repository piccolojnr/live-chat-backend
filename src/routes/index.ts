import express from "express"
import authRouter from "./authRoutes"
import userRouter from "./userRoutes"
import chatRouter from "./chatRoutes"
import redisClient from "../utils/redisClient"
import mongoClient from "../utils/db"
import AuthController from "../controllers/authController"

const router = express.Router()

router.get("/", (req, res) => {
    res.json({
        message: "API is running"
    })
})

router.get("/status", async (req, res) => {
    const status = redisClient.isAlive();
    const dbStatus = mongoClient.isAlive();

    return res.json({
        redis: status,
        db: dbStatus ? "OK" : "Error"
    })
})

router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/chat", AuthController.checkAuthMiddleware, chatRouter);

export default router;
