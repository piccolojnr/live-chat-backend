import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import router from './routes';
import { logger } from './utils/logger';
import morgan from 'morgan';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

mongoose.connect(process.env.MONGODB_URI!)
    .then(() => logger.info('Connected to MongoDB'))
    .catch((err) => logger.error('Error connecting to MongoDB:', err));

app.use('/api', router);

export default app;
