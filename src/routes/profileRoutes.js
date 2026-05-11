import express from 'express';
import {
  getProfile,
  updatePhone,
  updateProfilePicture,
  changePassword,
} from '../controllers/profileController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All profile routes require authentication only — no role restriction
router.use(protect);

// @route   GET /api/profile/me
router.get('/me', getProfile);

// @route   PATCH /api/profile/me/phone
router.patch('/me/phone', updatePhone);

// @route   PATCH /api/profile/me/picture
// TODO:    Add multer middleware here when storage is decided
// e.g.    router.patch('/me/picture', upload.single('profile_picture'), updateProfilePicture);
router.patch('/me/picture', updateProfilePicture);

// @route   PUT /api/profile/me/password
router.put('/me/password', changePassword);

export default router;