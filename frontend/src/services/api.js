import axios from 'axios';

const API_URL = 'http://localhost:5000/api/loans';

export const getLoans = async (limit, page) => {
  const params = limit && page ? { limit, page } : {};
  const response = await axios.get(API_URL, { params });
  return response.data;
};

export const getLoan = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

export const createLoan = async (loanData) => {
  const response = await axios.post(API_URL, loanData);
  return response.data;
};

export const updateLoan = async (id, loanData) => {
  const response = await axios.put(`${API_URL}/${id}`, loanData);
  return response.data;
};

export const deleteLoan = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};

// Auth
export const loginUser = async (credentials) => {
  const response = await axios.post('http://localhost:5000/api/auth/login', credentials);
  return response.data;
};

// Borrowers
export const getBorrowers = async (limit, page) => {
  const params = limit && page ? { limit, page } : {};
  const response = await axios.get('http://localhost:5000/api/borrowers', { params });
  return response.data;
};

export const bulkImportBorrowers = async (importData) => {
  const response = await axios.post('http://localhost:5000/api/borrowers/bulk-import', importData);
  return response.data;
};

export const createBorrower = async (formData) => {
  const response = await axios.post('http://localhost:5000/api/borrowers', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const updateBorrower = async (id, borrowerData) => {
  const response = await axios.put(`http://localhost:5000/api/borrowers/${id}`, borrowerData);
  return response.data;
};

export const assessEligibility = async (id) => {
  const response = await axios.post(`http://localhost:5000/api/borrowers/${id}/assess`);
  return response.data;
};

// ==========================================
// Dashboard Analytics & Simulation Services
// ==========================================

const DASHBOARD_URL = 'http://localhost:5000/api/dashboard';

export const fetchDashboardStats = async () => {
  const response = await axios.get(`${DASHBOARD_URL}/stats`);
  return response.data;
};

export const fetchGeographicData = async () => {
  const response = await axios.get(`${DASHBOARD_URL}/geographic`);
  return response.data;
};

export const fetchFraudAlerts = async () => {
  const response = await axios.get(`${DASHBOARD_URL}/fraud`);
  return response.data;
};

export const fetchRepaymentsData = async () => {
  const response = await axios.get(`${DASHBOARD_URL}/repayments`);
  return response.data;
};

export const fetchAiPredictions = async () => {
  const response = await axios.get(`${DASHBOARD_URL}/ai-insights`);
  return response.data;
};

export const fetchApiLogs = async () => {
  const response = await axios.get(`${DASHBOARD_URL}/api-logs`);
  return response.data;
};

export const fetchAuditLogs = async () => {
  const response = await axios.get(`${DASHBOARD_URL}/audit-logs`);
  return response.data;
};

export const fetchRecommendations = async (borrowerId) => {
  const response = await axios.get(`${DASHBOARD_URL}/recommendations`, {
    params: { borrowerId }
  });
  return response.data;
};

export const verifyDocument = async (borrowerId, verificationData) => {
  const response = await axios.post(`${DASHBOARD_URL}/borrowers/${borrowerId}/verify-document`, verificationData);
  return response.data;
};

export const updateLoanStage = async (loanId, lifecycleData) => {
  const response = await axios.post(`${DASHBOARD_URL}/loans/${loanId}/lifecycle`, lifecycleData);
  return response.data;
};

export const simulateRepayment = async (loanId, repaymentData) => {
  const response = await axios.post(`${DASHBOARD_URL}/loans/${loanId}/simulate-repayment`, repaymentData);
  return response.data;
};

export const addCollectionNote = async (taskId, collectionData) => {
  const response = await axios.post(`${DASHBOARD_URL}/collections/${taskId}`, collectionData);
  return response.data;
};

export const resetDatabase = async (resetData) => {
  const response = await axios.post(`${DASHBOARD_URL}/reset-db`, resetData);
  return response.data;
};

export const fetchIntegrations = async () => {
  const response = await axios.get('http://localhost:5000/api/integrations');
  return response.data;
};

export const createIntegration = async (integrationData) => {
  const response = await axios.post('http://localhost:5000/api/integrations', integrationData);
  return response.data;
};

export const updateIntegration = async (id, integrationData) => {
  const response = await axios.put(`http://localhost:5000/api/integrations/${id}`, integrationData);
  return response.data;
};

export const deleteIntegration = async (id) => {
  const response = await axios.delete(`http://localhost:5000/api/integrations/${id}`);
  return response.data;
};
