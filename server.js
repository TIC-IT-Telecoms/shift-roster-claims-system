import app from './src/app.js';
import './src/models/index.js';
import { logger } from './src/utils/logger.js';
import { connectDB, sequelize } from './src/config/database.js';
import { defineAssociations } from './src/models/associations.js';


const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    // DB Connection
    await connectDB();
    console.log('Database connected successfully');

    defineAssociations();

    // Sync DB
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync();
      console.log('Database synced (development mode)');
    }

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  logger.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

start();