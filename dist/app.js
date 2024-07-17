"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const routes_1 = __importDefault(require("./routes"));
const logger_1 = require("./utils/logger");
const morgan_1 = __importDefault(require("morgan"));
const db_1 = __importDefault(require("./utils/db"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_json_1 = __importDefault(require("./swagger.json"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use('/swagger', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_json_1.default));
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    credentials: true
}));
db_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat')
    .then(() => logger_1.logger.info('Connected to MongoDB'))
    .catch((err) => logger_1.logger.error('Error connecting to MongoDB:', err));
app.use('/api', routes_1.default);
exports.default = app;
