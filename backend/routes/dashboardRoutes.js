import express from 'express';
import {
  getDashboardStats,
  getGeographicAnalysis,
  getFraudStatus,
  getRepaymentsAndCollections,
  getLoanRecommendations,
  getAiInsights,
  getApiLogs,
  getAuditLogs,
  verifyDocument,
  updateLoanStage,
  simulateRepayment,
  addCollectionNote,
  resetDatabase
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/stats', getDashboardStats);
router.get('/geographic', getGeographicAnalysis);
router.get('/fraud', getFraudStatus);
router.get('/repayments', getRepaymentsAndCollections);
router.get('/recommendations', getLoanRecommendations);
router.get('/ai-insights', getAiInsights);
router.get('/api-logs', getApiLogs);
router.get('/audit-logs', getAuditLogs);

router.post('/borrowers/:id/verify-document', verifyDocument);
router.post('/loans/:id/lifecycle', updateLoanStage);
router.post('/loans/:id/simulate-repayment', simulateRepayment);
router.post('/collections/:id', addCollectionNote);
router.post('/reset-db', resetDatabase);

export default router;
