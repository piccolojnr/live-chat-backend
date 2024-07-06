import express from "express"
import authRouter from "./authRoutes"
import RedisClient from "../utils/redisClient"
import mongoose from "mongoose"
const redisClient = new RedisClient()

const router = express.Router()

router.get("/", (req, res) => {
    res.json({
        message: "Hello from the API"
    })
})

router.get("/status", async (req, res) => {
    const status = redisClient.isAlive()
    const dbStatus = mongoose.connection.readyState === 1

    return res.json({
        redis: status,
        db: dbStatus ? "OK" : "Error"
    })
})

router.use("/auth", authRouter)

export default router

