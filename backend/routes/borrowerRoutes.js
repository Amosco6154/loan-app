import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getBorrowers,
  getBorrower,
  createBorrower,
  updateBorrower,
  assessEligibility,
  serveDocument,
  bulkImportBorrowers
} from '../controllers/borrowerController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `id-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) cb(null, true);
    else cb(new Error('Only images and PDFs allowed'));
  }
});

const router = express.Router();

router.get('/', getBorrowers);
router.get('/document/:filename', serveDocument);
router.get('/:id', getBorrower);
router.post('/', upload.single('id_document'), createBorrower);
router.put('/:id', updateBorrower);
router.post('/:id/assess', assessEligibility);
router.post('/bulk-import', bulkImportBorrowers);

export default router;
