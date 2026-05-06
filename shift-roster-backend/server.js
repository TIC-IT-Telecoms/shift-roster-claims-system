import app from './src/app.js';
import dotenv from 'dotenv';
import { connectDB, sequelize } from './src/config/database.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    // DB Connection
    await connectDB();
    console.log('Database connected successfully');

    // Sync DB only in development
    if (process.env.NODE_ENV === 'dev') {
      await sequelize.sync({ alter: true });
      console.log('Database synced (development mode)');
    }

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

start();