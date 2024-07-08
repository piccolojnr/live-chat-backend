import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import router from './routes';
import { logger } from './utils/logger';
import morgan from 'morgan';
import mongoClient from './utils/db';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

mongoClient.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat')
    .then(() => logger.info('Connected to MongoDB'))
    .catch((err) => logger.error('Error connecting to MongoDB:', err));

app.use('/api', router);

export default app;
