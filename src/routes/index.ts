import express from "express"
import authRouter from "./authRoutes"
import userRouter from "./userRoutes"
import chatRouter from "./chatRoutes"
import RedisClient from "../utils/redisClient"
import mongoClient from "../utils/db"
const redisClient = new RedisClient()

const router = express.Router()

router.get("/", (req, res) => {
    res.json({
        message: "Hello from the API"
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
router.use("/chat", chatRouter);

export default router;
