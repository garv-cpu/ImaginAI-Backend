import express from 'express';
import cors from 'cors';
import connectDB from './config/mongodb.js';

import "dotenv/config";
import userRouter from './routes/userRoutes.js';
import imageRouter from './routes/imageRoutes.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Connections
await connectDB();

// Routes
app.use('/api/user', userRouter);
app.use('/api/image', imageRouter);


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})