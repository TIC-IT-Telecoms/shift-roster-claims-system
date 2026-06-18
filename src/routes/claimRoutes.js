import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  createClaim,
  getAllClaims,
  getClaimById,
  updateClaim,
  reviewClaim,
  deleteClaim
} from '../controllers/claimController.js';

const router = express.Router();

// Enforce authentication across all claim pathways
router.use(protect);

// Standard collection pathways
router.route('/')
  .post(authorizeRoles('Employee'), createClaim) // Only employees can submit fresh claims
  .get(getAllClaims);                        // Admins see everything; Employees see only their own records

// Individual claim pathways
router.route('/:id')
  .get(getClaimById)                             // Securely routes view rights depending on role/ownership
  .put(authorizeRoles('Employee'), updateClaim)  // Only the owning employee can alter a pending claim
  .delete(authorizeRoles('Employee'), deleteClaim); // Only the owning employee can delete a pending claim

// Administrative approval pathway
router.patch('/:id/status', authorizeRoles('Admin'), reviewClaim);

export default router;