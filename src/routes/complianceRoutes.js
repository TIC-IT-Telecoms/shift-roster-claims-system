import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { checkCompliance, getComplianceFlags, resolveFlag } from '../controllers/complianceController.js';

const router = express.Router();

// Apply auth protection middleware globally across all matching routes
router.use(protect);

// Global list collections route
// GET /api/compliance -> Admin gets full company log view; Employee sees only their own compliance exceptions
router.route('/')
  .get(getComplianceFlags);

// Run the evaluation analysis rule engine
// POST /api/compliance/check -> Restrict access to Admin accounts only
router.post('/check', authorizeRoles('Admin'), checkCompliance);

// Dismiss or log exception resolution adjustments
// PATCH /api/compliance/:id/resolve -> Restrict access to Admin accounts only
router.patch('/:id/resolve', authorizeRoles('Admin'), resolveFlag);

export default router;