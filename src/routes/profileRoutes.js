import express from 'express';
import {
  getProfile,
  updatePhone,
  updateAddress,
  updateProfilePicture,
  changePassword,
} from '../controllers/profileController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/profile
router.get('/', getProfile);

// @route   PATCH /api/profile/phone
router.patch('/phone', updatePhone);

// @route   PATCH /api/profile/address
router.patch('/address', updateAddress);

// @route   PATCH /api/profile/picture
// TODO: Add multer middleware here when storage is decided
router.patch('/picture', updateProfilePicture);

// @route   PUT /api/profile/password
router.put('/password', changePassword);

export default router;