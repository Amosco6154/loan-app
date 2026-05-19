import express from 'express';
import {
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration
} from '../controllers/integrationController.js';

const router = express.Router();

router.get('/', getIntegrations);
router.post('/', createIntegration);
router.put('/:id', updateIntegration);
router.delete('/:id', deleteIntegration);

export default router;
