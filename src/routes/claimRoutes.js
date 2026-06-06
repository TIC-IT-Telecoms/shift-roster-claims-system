import express from 'express';
import {
  submitClaim, getMyClaims, getAllClaims, getClaimById,
  updateClaim, reviewClaim, resetClaimStatus, deleteClaim,
} from '../controllers/claimController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

//  Employee routes
router.post('/', protect, submitClaim);
router.get('/me', protect, getMyClaims);
router.put('/:id', protect, updateClaim);

//  Admin routes
router.get('/', protect, authorizeRoles('Admin'), getAllClaims);
router.get('/:id', protect, authorizeRoles('Admin'), getClaimById);
router.patch('/:id/status', protect, authorizeRoles('Admin'), reviewClaim);
router.patch('/:id/reset', protect, authorizeRoles('Admin'), resetClaimStatus);
router.delete('/:id', protect, authorizeRoles('Admin'), deleteClaim);

export default router;