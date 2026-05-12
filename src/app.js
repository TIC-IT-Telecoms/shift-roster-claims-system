import express from 'express';
import { corsMiddleware } from './middleware/cors.js';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import employeesRoutes from './routes/employeesRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import shiftRoutes from './routes/shiftRoutes.js';
import rotationRoutes from './routes/rotationRoutes.js';
import rosterRoutes from './routes/rosterRoutes.js';
import holidayRoutes from './routes/holidayRoutes.js';

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(corsMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (_req, res) => { res.send('Shift Roster API is running'); });
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/profile/me', profileRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/rotations', rotationRoutes);
app.use('/api/rosters', rosterRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api', userRoutes);

// 404 Route Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error Handler
app.use(errorHandler);

export default app;