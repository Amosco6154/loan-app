import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getLoans,
  getBorrowers,
  createLoan,
  createBorrower,
  updateBorrower,
  assessEligibility,
  fetchDashboardStats,
  fetchGeographicData,
  fetchFraudAlerts,
  fetchRepaymentsData,
  fetchAiPredictions,
  fetchApiLogs,
  fetchAuditLogs,
  fetchRecommendations,
  verifyDocument,
  updateLoanStage,
  simulateRepayment,
  addCollectionNote,
  resetDatabase,
  bulkImportBorrowers,
  fetchIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration
} from '../services/api';

// Reusable UI components
const Card = ({ title, subtitle, children, className = "" }) => (
  <div className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm ${className}`}>
    {(title || subtitle) && (
      <div className="mb-4">
        {title && <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">{title}</h3>}
        {subtitle && <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const QuickStat = ({ value, label, trend, trendUp }) => {
  return (
    <div className="bg-slate-50 backdrop-blur-md rounded-2xl p-4 border border-slate-200 flex justify-between items-end">
      <div>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-800 mt-1 tracking-tight">{value}</p>
      </div>
      {trend && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
          {trend}
        </span>
      )}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();

  // Core Data States
  const [stats, setStats] = useState(null);
  const [geographic, setGeographic] = useState([]);
  const [fraud, setFraud] = useState({ alerts: [], ipCollisions: [] });
  const [repayments, setRepayments] = useState({ installments: [], collectionTasks: [], defaultPredictions: [] });
  const [aiPredictions, setAiPredictions] = useState(null);
  const [apiLogs, setApiLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loans, setLoans] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Interaction/UI States
  const [activePanel, setActivePanel] = useState('intelligence');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Simulation Modal States
  const [recEngineData, setRecEngineData] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [simPaymentAmount, setSimPaymentAmount] = useState('');
  const [selectedSimLoanId, setSelectedSimLoanId] = useState('');
  const [collectionNotes, setCollectionNotes] = useState('');
  const [collectionStatus, setCollectionStatus] = useState('contacted');
  const [docVerifyNotes, setDocVerifyNotes] = useState('');
  const [borrowerAuditNotes, setBorrowerAuditNotes] = useState({});
  const [selectedAuditLoan, setSelectedAuditLoan] = useState(null);
  const [committeeDecisionNote, setCommitteeDecisionNote] = useState('');

  // Settings States
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  // Simulated Integrations settings state
  const [integrationKeys, setIntegrationKeys] = useState({
    mpesaKey: 'mpesa_client_id_live_928k12c9842a',
    crbKey: 'crb_bureau_token_auth_8312d93e1102',
    smsId: 'QUICKCASH_SMS',
    webhook: 'https://api.quickcash.com/v1/webhook/incoming'
  });
  const [integrationStatuses, setIntegrationStatuses] = useState({
    mpesa: true,
    sms: true,
    bank: true,
    crb: true
  });
  const [integrationsList, setIntegrationsList] = useState([]);
  const [newIntegrationData, setNewIntegrationData] = useState({ name: '', key_value: '', status: 'online' });
  const [editingIntegrationId, setEditingIntegrationId] = useState(null);
  const [editingIntegrationData, setEditingIntegrationData] = useState({ name: '', key_value: '', status: 'online' });

  // Mobile Viewport Simulation States
  const [mobileBorrowerId, setMobileBorrowerId] = useState('1'); // Defaults to Alice
  const [mobileLoan, setMobileLoan] = useState(null);
  const [mobileInstallments, setMobileInstallments] = useState([]);
  const [mobilePaymentSimAmount, setMobilePaymentSimAmount] = useState('');
  const [mobileNotifFeed, setMobileNotifFeed] = useState([
    { id: 1, title: "Loan Disbursed", text: "Your Business Loan of $12,000 has been paid to your verified Bank Account.", time: "4d ago" },
    { id: 2, title: "Installment Due", text: "Next repayment of $1,000 is due in 15 days.", time: "1d ago" }
  ]);

  // Modals for adding entries
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isBorrowerModalOpen, setIsBorrowerModalOpen] = useState(false);
  const [selectedBorrowerProfile, setSelectedBorrowerProfile] = useState(null);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [editBorrowerData, setEditBorrowerData] = useState({});
  const [newLoanData, setNewLoanData] = useState({ borrower_id: '', amount: '', interest_rate: '8.5', repayment_period: '12', loan_product: 'Personal Advance', purpose: 'General consumption' });
  const [newBorrowerData, setNewBorrowerData] = useState({ full_name: '', phone_number: '', national_id: '', address: '', region: 'Nairobi', date_of_birth: '1995-01-01', gender: 'male', email: '', occupation: '', employer: '', monthly_income: '', savings_balance: '' });

  // Pagination & Bulk Import Upgrades
  const [borrowersPage, setBorrowersPage] = useState(1);
  const [borrowersLimit, setBorrowersLimit] = useState(5);
  const [borrowersTotal, setBorrowersTotal] = useState(0);
  const [borrowersPages, setBorrowersPages] = useState(1);

  const [loansPage, setLoansPage] = useState(1);
  const [loansLimit, setLoansLimit] = useState(5);
  const [loansTotal, setLoansTotal] = useState(0);
  const [loansPages, setLoansPages] = useState(1);

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkParsedData, setBulkParsedData] = useState([]);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportSummary, setBulkImportSummary] = useState(null);
  const [bulkTab, setBulkTab] = useState('template'); // 'template', 'file', 'text', 'preview'

  // References
  const terminalEndRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Main Data Loading
  const loadBorrowers = useCallback(async (page, limit) => {
    try {
      const res = await getBorrowers(limit, page);
      const data = res.data ? res.data : res;
      setBorrowers(data);
      if (res.pagination) {
        setBorrowersTotal(res.pagination.total);
        setBorrowersPages(res.pagination.pages);
      } else {
        setBorrowersTotal(data.length);
        setBorrowersPages(1);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading borrowers.', 'error');
    }
  }, []);

  const loadLoans = useCallback(async (page, limit) => {
    try {
      const res = await getLoans(limit, page);
      const data = res.data ? res.data : res;
      setLoans(data);
      if (res.pagination) {
        setLoansTotal(res.pagination.total);
        setLoansPages(res.pagination.pages);
      } else {
        setLoansTotal(data.length);
        setLoansPages(1);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading loans.', 'error');
    }
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [
        statsData, geoData, fraudData, repData, aiData, logsData, auditData, loansData, borrowersData, integrationsData
      ] = await Promise.all([
        fetchDashboardStats(),
        fetchGeographicData(),
        fetchFraudAlerts(),
        fetchRepaymentsData(),
        fetchAiPredictions(),
        fetchApiLogs(),
        fetchAuditLogs(),
        getLoans(loansLimit, loansPage),
        getBorrowers(borrowersLimit, borrowersPage),
        fetchIntegrations()
      ]);

      setStats(statsData);
      setGeographic(geoData);
      setFraud(fraudData);
      setRepayments(repData);
      setAiPredictions(aiData);
      setApiLogs(logsData);
      setAuditLogs(auditData);
      setIntegrationsList(integrationsData);

      const fetchedLoans = loansData.data ? loansData.data : loansData;
      const fetchedBorrowers = borrowersData.data ? borrowersData.data : borrowersData;

      setLoans(fetchedLoans);
      setBorrowers(fetchedBorrowers);

      if (loansData.pagination) {
        setLoansTotal(loansData.pagination.total);
        setLoansPages(loansData.pagination.pages);
      } else {
        setLoansTotal(fetchedLoans.length);
        setLoansPages(1);
      }

      if (borrowersData.pagination) {
        setBorrowersTotal(borrowersData.pagination.total);
        setBorrowersPages(borrowersData.pagination.pages);
      } else {
        setBorrowersTotal(fetchedBorrowers.length);
        setBorrowersPages(1);
      }

      // Setup default loan data for mobile simulation
      const currentSimB = fetchedBorrowers.find(b => b.id === Number(mobileBorrowerId)) || fetchedBorrowers[0];
      if (currentSimB) {
        const matchingLoans = fetchedLoans.filter(l => l.borrower_id === currentSimB.id);
        const activeSimLoan = matchingLoans.find(l => l.status === 'active' || l.status === 'overdue') || matchingLoans[0];
        setMobileLoan(activeSimLoan || null);

        if (activeSimLoan) {
          const matchingInstallments = repData.installments.filter(i => i.loan_id === activeSimLoan.id);
          setMobileInstallments(matchingInstallments);
        } else {
          setMobileInstallments([]);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to sync control center databases.');
    } finally {
      setLoading(false);
    }
  }, [mobileBorrowerId, loansLimit, loansPage, borrowersLimit, borrowersPage]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
    } else {
      const parsedUser = JSON.parse(userStr);
      setCurrentUser(parsedUser);
      loadAllData();
    }
  }, [navigate, loadAllData]);


  // Reactive pagination updates
  useEffect(() => {
    if (currentUser) {
      loadBorrowers(borrowersPage, borrowersLimit);
    }
  }, [borrowersPage, borrowersLimit, loadBorrowers, currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadLoans(loansPage, loansLimit);
    }
  }, [loansPage, loansLimit, loadLoans, currentUser]);

  // Terminal scroll to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [apiLogs]);

  // Trigger simulated logger feeds
  const logApiActivity = (type, status, message) => {
    const newLog = {
      time: new Date().toISOString(),
      type,
      status,
      message
    };
    setApiLogs(prev => [...prev, newLog]);
  };

  // Document Verification Action
  const handleVerifyDocument = async (borrowerId, status, customNotes = '') => {
    try {
      await verifyDocument(borrowerId, { 
        status, 
        notes: customNotes || docVerifyNotes, 
        adminEmail: currentUser?.email || 'admin@loanmanager.com' 
      });
      showToast(`Document successfully ${status === 'verified' ? 'Approved' : 'Rejected'}.`);
      logApiActivity('SEC_DOC', status === 'verified' ? 'SUCCESS' : 'FLAGGED', `Verified document for Borrower ID ${borrowerId}. Notes: ${customNotes || docVerifyNotes || 'None'}`);
      setDocVerifyNotes('');
      setBorrowerAuditNotes(prev => ({ ...prev, [borrowerId]: '' }));
      loadAllData();
    } catch (err) {
      showToast('Error updating document status.', 'error');
    }
  };

  // Eligibility Check Trigger
  const handleAssessEligibility = async (id, name) => {
    try {
      const res = await assessEligibility(id);
      showToast(`Assessment Complete — ${res.eligibility_status.toUpperCase()} (Score: ${res.credit_score})`);
      logApiActivity('CRB', 'SUCCESS', `Evaluated automated credit scoring rules for ${name}. Score: ${res.credit_score}`);
      loadAllData();
    } catch (err) {
      showToast('Error assessing eligibility.', 'error');
    }
  };

  // Open Borrower Profile
  const handleOpenBorrowerProfile = (borrower) => {
    setSelectedBorrowerProfile(borrower);
    setIsProfileEditing(false);
    setEditBorrowerData({ ...borrower });
  };

  // Save Edited Borrower Profile
  const handleSaveBorrowerProfile = async () => {
    try {
      await updateBorrower(editBorrowerData.id, editBorrowerData);
      showToast("Borrower profile updated successfully.");
      logApiActivity('ADMIN_EDIT', 'SUCCESS', `Updated borrower profile for ${editBorrowerData.full_name}.`);
      
      setSelectedBorrowerProfile({ ...editBorrowerData });
      setIsProfileEditing(false);
      loadAllData();
    } catch (err) {
      showToast(`Error updating profile: ${err.message}`, 'error');
    }
  };

  // Create API Integration
  const handleCreateIntegration = async () => {
    if (!newIntegrationData.name || !newIntegrationData.key_value) {
      showToast('Please provide both a name and a value for the integration.', 'error');
      return;
    }
    try {
      await createIntegration(newIntegrationData);
      showToast(`Integration '${newIntegrationData.name}' created successfully.`);
      setNewIntegrationData({ name: '', key_value: '', status: 'online' });
      loadAllData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating integration.', 'error');
    }
  };

  // Update API Integration
  const handleUpdateIntegration = async (id) => {
    if (!editingIntegrationData.name || !editingIntegrationData.key_value) {
      showToast('Please provide both a name and a value for the integration.', 'error');
      return;
    }
    try {
      await updateIntegration(id, editingIntegrationData);
      showToast(`Integration '${editingIntegrationData.name}' updated successfully.`);
      setEditingIntegrationId(null);
      loadAllData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating integration.', 'error');
    }
  };

  // Delete API Integration
  const handleDeleteIntegration = async (id, name) => {
    if (!window.confirm(`Are you absolutely sure you want to delete the API integration '${name}'?`)) {
      return;
    }
    try {
      await deleteIntegration(id);
      showToast(`Integration '${name}' deleted successfully.`);
      loadAllData();
    } catch (err) {
      showToast('Error deleting integration.', 'error');
    }
  };

  // Toggle API Integration Status
  const handleToggleDbIntegration = async (integration) => {
    const nextStatus = integration.status === 'online' ? 'offline' : 'online';
    try {
      await updateIntegration(integration.id, {
        name: integration.name,
        key_value: integration.key_value,
        status: nextStatus
      });
      showToast(`${integration.name.toUpperCase()} integration set to ${nextStatus.toUpperCase()}.`);
      loadAllData();
    } catch (err) {
      showToast('Error toggling integration status.', 'error');
    }
  };

  // Bulk Import Handler Functions
  const handleBulkImportSubmit = async () => {
    if (bulkParsedData.length === 0) {
      showToast('No valid records parsed to import.', 'error');
      return;
    }

    try {
      setBulkImportLoading(true);
      const res = await bulkImportBorrowers({
        borrowers: bulkParsedData,
        adminEmail: currentUser?.email || 'admin@loanmanager.com'
      });

      setBulkImportSummary(res.summary);
      showToast(`Successfully imported ${res.summary.success} borrowers!`, 'success');
      
      // Reload lists
      loadAllData();
      
      // Reset states
      setBulkParsedData([]);
      setBulkCsvText('');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Error executing bulk import.', 'error');
    } finally {
      setBulkImportLoading(false);
    }
  };

  const parseCsvText = (text) => {
    if (!text.trim()) return [];
    
    const lines = text.split('\n');
    if (lines.length <= 1) return [];

    // Header extraction
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    
    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      
      const record = {};
      headers.forEach((header, idx) => {
        record[header] = cols[idx] || '';
      });

      parsed.push(record);
    }
    return parsed;
  };

  const handleDownloadCsvTemplate = () => {
    const headers = "full_name,phone_number,national_id,address,region,date_of_birth,gender,email,occupation,employer,monthly_income,savings_balance,collateral_info,debt_to_income_ratio";
    const sampleRow = "John Doe,+254 712 333 444,11223344,Upper Hill Nairobi,Nairobi,1992-04-12,male,john.doe@email.com,Project Officer,Safaricom PLC,3500,4200,Car Logbook KCC 456X,0.18";
    
    const blob = new Blob([`${headers}\n${sampleRow}`], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "borrower_bulk_import_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Bulk import CSV template downloaded.");
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        setBulkCsvText(text);
        const parsed = parseCsvText(text);
        setBulkParsedData(parsed);
        setBulkTab('preview');
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        setBulkCsvText(text);
        const parsed = parseCsvText(text);
        setBulkParsedData(parsed);
        setBulkTab('preview');
      };
      reader.readAsText(file);
    }
  };

  // Recommendation Engine Fetcher
  const handleFetchRecommendations = async (borrowerId) => {
    try {
      setRecLoading(true);
      const res = await fetchRecommendations(borrowerId);
      setRecEngineData(res);
      logApiActivity('AI_REC', 'SUCCESS', `Recommendation engine generated suitable offerings for ${res.borrower.name}.`);
    } catch (err) {
      showToast('Error querying recommendation engine.', 'error');
    } finally {
      setRecLoading(false);
    }
  };

  // Lifecycle stage updates
  const handleLifecycleStage = async (loanId, stage) => {
    try {
      const res = await updateLoanStage(loanId, { 
        stage, 
        adminEmail: currentUser?.email || 'admin@loanmanager.com' 
      });
      showToast(`Lifecycle stage updated: ${stage.toUpperCase()}`);
      logApiActivity('LIFECYCLE', 'SUCCESS', `Advanced Loan ID ${loanId} to lifecycle stage: ${stage.toUpperCase()}.`);
      loadAllData();
    } catch (err) {
      showToast('Error advancing lifecycle stage.', 'error');
    }
  };

  // Credit Committee Audit Actions
  const handleAuditCommitteeDecision = async (loanId, decision, committeeNote = '') => {
    try {
      const stageMap = {
        approve: 'approved',
        decline: 'declined',
        flag: 'defaulted'
      };
      
      const targetStage = stageMap[decision];
      await updateLoanStage(loanId, {
        stage: targetStage,
        adminEmail: currentUser?.email || 'committee@quickcash.com'
      });
      
      logApiActivity('CREDIT_COMMITTEE', decision === 'approve' ? 'SUCCESS' : 'FLAGGED', 
        `Audit Committee Decision: ${decision.toUpperCase()} for Loan ID ${loanId}. Note: ${committeeNote || 'None'}`
      );
      
      showToast(`Credit Committee decision successfully executed: ${decision.toUpperCase()}.`);
      setSelectedAuditLoan(null);
      loadAllData();
    } catch (err) {
      showToast(`Error executing committee decision: ${err.message}`, 'error');
    }
  };

  // Admin Repayment Simulation
  const handleSimulateRepayment = async (loanId, amount) => {
    if (!amount || isNaN(amount)) {
      showToast('Please enter a valid numeric repayment amount.', 'error');
      return;
    }
    try {
      await simulateRepayment(loanId, { 
        amount: parseFloat(amount),
        adminEmail: currentUser?.email || 'admin@loanmanager.com'
      });
      showToast(`Simulated Payment of $${amount} successful.`);
      logApiActivity('M-PESA', 'COMPLETED', `Received repayment of $${amount} towards Loan ID ${loanId}.`);
      setSimPaymentAmount('');
      loadAllData();
    } catch (err) {
      showToast('Failed to process repayment.', 'error');
    }
  };

  // Collection Task updates
  const handleAddCollectionNote = async (taskId, name) => {
    if (!collectionNotes.trim()) {
      showToast('Collection note cannot be empty.', 'error');
      return;
    }
    try {
      await addCollectionNote(taskId, { 
        notes: collectionNotes, 
        recovery_status: collectionStatus, 
        adminEmail: currentUser?.email || 'admin@loanmanager.com' 
      });
      showToast('Collection logs updated successfully.');
      logApiActivity('SMS', 'SENT', `Collections notification sent to ${name}. Status: ${collectionStatus.toUpperCase()}`);
      setCollectionNotes('');
      loadAllData();
    } catch (err) {
      showToast('Failed to save collection updates.', 'error');
    }
  };

  // Create Loan Submission
  const handleCreateLoanSubmit = async (e) => {
    e.preventDefault();
    if (!newLoanData.borrower_id || !newLoanData.amount) {
      showToast('Please fill all required fields.', 'error');
      return;
    }
    try {
      const res = await createLoan({
        borrower_id: Number(newLoanData.borrower_id),
        amount: parseFloat(newLoanData.amount),
        interest_rate: parseFloat(newLoanData.interest_rate),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        loan_product: newLoanData.loan_product,
        purpose: newLoanData.purpose
      });
      showToast('New loan request registered in database.');
      setIsLoanModalOpen(false);
      logApiActivity('LIFECYCLE', 'SUCCESS', `Created loan application ID ${res.id} for Borrower ID ${newLoanData.borrower_id}.`);
      loadAllData();
    } catch (err) {
      showToast('Error registering loan application.', 'error');
    }
  };

  // Create Borrower Submission
  const handleCreateBorrowerSubmit = async (e) => {
    e.preventDefault();
    if (!newBorrowerData.full_name || !newBorrowerData.national_id || !newBorrowerData.phone_number) {
      showToast('Full Name, National ID and Phone are required.', 'error');
      return;
    }

    try {
      const data = new FormData();
      Object.entries(newBorrowerData).forEach(([key, val]) => {
        data.append(key, val);
      });

      await createBorrower(data);
      showToast('Borrower registered successfully.');
      setIsBorrowerModalOpen(false);
      logApiActivity('CRB', 'SUCCESS', `Registered profile for ${newBorrowerData.full_name}. ID Verified.`);
      loadAllData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error registering borrower.', 'error');
    }
  };

  // Mobile Simulator: Make Repayment Sim
  const handleMobileRepaymentSubmit = async (e) => {
    e.preventDefault();
    if (!mobilePaymentSimAmount || isNaN(mobilePaymentSimAmount) || !mobileLoan) {
      showToast('Please enter a valid amount to repay.', 'error');
      return;
    }

    try {
      const amt = parseFloat(mobilePaymentSimAmount);
      await simulateRepayment(mobileLoan.id, { 
        amount: amt, 
        adminEmail: `client-${mobileBorrowerId}@clientportal.com` 
      });
      
      const updatedNotif = [
        { id: Date.now(), title: "Payment Successful", text: `Your payment of $${amt} has been successfully cleared.`, time: "Just now" },
        ...mobileNotifFeed
      ];
      setMobileNotifFeed(updatedNotif);
      setMobilePaymentSimAmount('');
      
      showToast(`Mobile payment of $${amt} processed!`);
      logApiActivity('M-PESA', 'COMPLETED', `Client portal payment processed for Borrower ID ${mobileBorrowerId}.`);
      loadAllData();
    } catch (err) {
      showToast('Mobile payment failed.', 'error');
    }
  };

  // Toggle API integrations status (dynamically audits administrative settings alterations!)
  const handleToggleIntegration = (gateway) => {
    const nextVal = !integrationStatuses[gateway];
    setIntegrationStatuses(prev => ({ ...prev, [gateway]: nextVal }));
    
    // Push real-time audit event
    showToast(`${gateway.toUpperCase()} Integration Gateway set to ${nextVal ? 'ONLINE' : 'OFFLINE'}.`);
    logApiActivity('SETTINGS', 'UPDATE', `Administrator toggled ${gateway.toUpperCase()} connection status to ${nextVal ? 'ONLINE' : 'OFFLINE'}.`);
  };

  // Simulate SQL Database Backup
  const handleTriggerBackup = () => {
    setBackupLoading(true);
    setBackupProgress(10);
    
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setBackupLoading(false);
          showToast('Database SQL snapshot successfully compiled and downloaded.');
          logApiActivity('BACKUP', 'SUCCESS', `Manual full database restore point snapshot successfully compiled by ${currentUser?.email || 'admin@loanmanager.com'}`);
          
          // Generate mock JSON dump download
          const mockDump = {
            backupTimestamp: new Date().toISOString(),
            schemaVersion: '2.4',
            statistics: stats,
            borrowersCount: borrowers.length,
            loansCount: loans.length
          };
          const blob = new Blob([JSON.stringify(mockDump, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `quickcash_db_backup_${Date.now()}.json`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          return 0;
        }
        return prev + 30;
      });
    }, 400);
  };

  // Nuclear Reset (Fresh Install - leaves users/admins but wipes operational data)
  const handleNuclearWipeExecute = async () => {
    if (resetConfirmText !== 'CONFIRM') {
      showToast('Please type the word CONFIRM to execute.', 'error');
      return;
    }

    try {
      setResetLoading(true);
      await resetDatabase({ adminEmail: currentUser?.email || 'admin@loanmanager.com' });
      showToast('Operational database completely wiped. Fresh install ready.');
      setIsResetConfirmOpen(false);
      setResetConfirmText('');
      
      // Wipe state locally immediately to reflect change, then reload
      setLoans([]);
      setBorrowers([]);
      setGeographic([]);
      setFraud({ alerts: [], ipCollisions: [] });
      setRepayments({ installments: [], collectionTasks: [], defaultPredictions: [] });
      
      await loadAllData();
    } catch (err) {
      showToast('Error resetting database operational tables.', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // Export Reports
  const handleExportData = (type) => {
    let content = "";
    let filename = "";

    if (type === 'loans') {
      content = "ID,Borrower Name,National ID,Product,Amount,Interest Rate,Repayment Period,Status,Stage,Repaid Amount,Due Date\n" +
        loans.map(l => `${l.id},"${l.borrower_name}","${l.national_id}","${l.loan_product}",${l.amount},${l.interest_rate}%,${l.repayment_period} months,${l.status},${l.stage},${l.repaid_amount},${l.due_date}`).join("\n");
      filename = "loans_lifecycle_report.csv";
    } else if (type === 'borrowers') {
      content = "ID,Full Name,National ID,Region,Monthly Income,Savings Balance,Credit Score,Financial Health,Eligibility,Segment\n" +
        borrowers.map(b => `${b.id},"${b.full_name}","${b.national_id}","${b.region}",${b.monthly_income},${b.savings_balance},${b.credit_score},${b.financial_health_score},${b.eligibility_status},"${b.customer_segment || 'N/A'}"`).join("\n");
      filename = "borrowers_analytics_report.csv";
    } else {
      content = "Region,Loan Count,Total Borrowed,Total Repaid,Default Amount,Repayment Success Rate\n" +
        geographic.map(g => `"${g.region}",${g.loansCount},${g.totalBorrowed},${g.totalRepaid},${g.defaultAmount},${g.repaymentSuccessRate}%`).join("\n");
      filename = "regional_profitability_report.csv";
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${filename} generated and downloaded.`);
  };

  // Filtered lists for quick lookup
  const filteredBorrowers = borrowers.filter(b =>
    b.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.national_id.includes(searchQuery)
  );

  const filteredLoans = loans.filter(l =>
    l.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.loan_product && l.loan_product.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased relative">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] left-[10%] w-[500px] h-[500px] bg-indigo-850 rounded-full blur-[150px] opacity-2" />
        <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] bg-amber-500 rounded-full blur-[150px] opacity-5" />
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl shadow-2xl text-slate-800 text-xs font-semibold flex items-center gap-3 animate-bounce border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <span>{toast.type === 'success' ? '✓' : '✗'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner / Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 relative">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Unified Shield Logo */}
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center border border-indigo-500/25 shadow-lg shadow-indigo-900/30">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <circle cx="12" cy="11" r="3" />
                <path d="M12 8v6M10 11h4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-lg font-bold tracking-tight text-white">QuickCash</span>
                <span className="text-lg font-light text-amber-600"> Finance</span>
              </div>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none mt-0.5">Admin Intelligence Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Authorized Session</p>
              <p className="text-xs font-bold text-slate-700">{currentUser?.email || 'admin@loanmanager.com'}</p>
            </div>
            <button
              onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
              className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-900/60 px-4 py-2 rounded-xl transition-all border border-rose-200 cursor-pointer"
            >
              Sign Out →
            </button>
          </div>
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row gap-6 relative z-10">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <div className="bg-white backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-xl space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Workspace Modules</p>
            
            {[
              { id: 'intelligence', label: 'Intelligence Panel', icon: '🧠' },
              { id: 'analytics', label: 'Borrower Analytics', icon: '👥' },
              { id: 'geographic', label: 'Geographic Analysis', icon: '🌍' },
              { id: 'loans', label: 'Loans & Lifecycle', icon: '💼' },
              { id: 'repayments', label: 'Repayments & Tasks', icon: '📅' },
              { id: 'products', label: 'Products & Forecast', icon: '📈' },
              { id: 'security', label: 'Fraud & Verifier', icon: '🛡️' },
              { id: 'audit_logs', label: 'Security Logs', icon: '🔒' },
              { id: 'settings', label: 'System Settings', icon: '⚙️' },
              { id: 'exports', label: 'Exports & Reporting', icon: '📥' },
              { id: 'simulator', label: 'Mobile App Sim', icon: '📱' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left border ${activePanel === tab.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/10' : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-white'}`}
              >
                <span className="text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-white backdrop-blur-md text-slate-500 rounded-2xl p-4 border border-slate-200 shadow-xl hidden md:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">System Gateway</p>
            <div className="mt-3 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span>SQL Engine:</span>
                <span className="font-semibold text-slate-700">SQLite3</span>
              </div>
              <div className="flex justify-between">
                <span>DB Schema:</span>
                <span className="font-semibold text-slate-700">V2.4 Active</span>
              </div>
              <div className="flex justify-between">
                <span>API Status:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">● Online</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Dashboard Work Area */}
        <main className="flex-1 min-w-0">
          {loading ? (
            <div className="bg-white backdrop-blur-md rounded-2xl border border-slate-200 p-12 text-center shadow-xl">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Syncing Control Center Databases...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 text-rose-700 border border-rose-200 p-6 rounded-2xl font-bold shadow-xl">
              {error}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* PANEL 1: Intelligence Panel */}
              {activePanel === 'intelligence' && stats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <QuickStat label="Active Portfolio" value={`$${(stats.financials.outstanding || 0).toLocaleString()}`} trend="+14.2%" trendUp />
                    <QuickStat label="Approved Loans" value={stats.totals.active + stats.totals.completed + stats.totals.overdue} trend="+8.5%" trendUp />
                    <QuickStat label="Interest Accrued" value={`$${Math.round(stats.financials.interestIncome || 0).toLocaleString()}`} trend="+12.0%" trendUp />
                    <QuickStat label="Default Risk" value={`${stats.totals.overdue} Critical`} trend="Cases Active" trendUp={false} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Admin Intel Overview" subtitle="System-wide performance highlights and insights." className="lg:col-span-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-850 text-center">
                          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Applications</p>
                          <p className="text-2xl font-black text-slate-800 mt-1">{stats.totals.applications}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">Total Submitted</p>
                        </div>
                        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-850 text-center">
                          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Pending Decisions</p>
                          <p className="text-2xl font-black text-amber-500 mt-1">{stats.totals.pending}</p>
                          <p className="text-[9px] text-amber-550/70 mt-0.5">Awaiting Underwriter</p>
                        </div>
                        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-850 text-center col-span-2 md:col-span-1">
                          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Recovery Success</p>
                          <p className="text-2xl font-black text-emerald-500 mt-1">{stats.financials.recoveryRate}%</p>
                          <p className="text-[9px] text-emerald-550/70 mt-0.5">Portfolio Clear Rate</p>
                        </div>
                      </div>

                      <div className="mt-6 border-t border-slate-200 pt-6">
                        <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">AI Prediction Engines Active</h4>
                        <div className="bg-indigo-950/20 rounded-2xl p-4 border border-indigo-950 flex items-start gap-4">
                          <span className="text-2xl mt-1">🤖</span>
                          <div>
                            <p className="text-xs font-bold text-slate-700">Demand Forecasting Alert</p>
                            <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                              Neural models predict a <span className="text-indigo-400 font-bold">14.6% spike</span> in borrower demand over the coming 30 days, heavily clustered in the <span className="font-bold text-slate-350">Student & Salaried segments</span>. Capital reserves are verified sufficient.
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card title="System Alerts & Notifications" subtitle="Real-time triggered communications feed.">
                      <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                        {stats.totals.pending > 0 && (
                          <div className="p-3 bg-amber-950/30 border border-amber-200 rounded-xl text-xs">
                            <p className="font-bold text-amber-600">Pending Review Alerts</p>
                            <p className="text-slate-600 mt-1">{stats.totals.pending} loan applications require manual underwriter verification.</p>
                          </div>
                        )}
                        {stats.totals.overdue > 0 && (
                          <div className="p-3 bg-rose-950/30 border border-rose-200 rounded-xl text-xs">
                            <p className="font-bold text-rose-600">Collections Task Flagged</p>
                            <p className="text-slate-600 mt-1">{stats.totals.overdue} active accounts are past due. Automatic SMS reminders dispatched.</p>
                          </div>
                        )}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                          <p className="font-bold text-slate-700">Bank Verification Hook</p>
                          <p className="text-slate-600 mt-1">SMS gateway reporting 100% delivery success over past 24 hours.</p>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                          <p className="font-bold text-slate-700">CRB Integration</p>
                          <p className="text-slate-600 mt-1">Automated credit rating inquires successfully completed for all active profiles.</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* PANEL 2: Borrower Analytics */}
              {activePanel === 'analytics' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card title="Registered Borrowers" subtitle="Total profiles active in database.">
                      <p className="text-3xl font-extrabold text-slate-800 mt-2">{borrowers.length}</p>
                    </Card>
                    <Card title="System-wide Credit Score" subtitle="Average rating of active portfolio.">
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-3xl font-extrabold text-indigo-400">{stats ? stats.borrowers.avgCreditScore : '—'}</p>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase border border-emerald-200">Good Tier</span>
                      </div>
                    </Card>
                    <Card title="Financial Health Index" subtitle="Aggregated repayment discipline rating.">
                      <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats ? stats.borrowers.avgFinancialHealth : '—'}/100</p>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Customer Segmentation Mapping" subtitle="Distribution of borrowers across categories.">
                      <div className="space-y-4">
                        {aiPredictions && aiPredictions.segmentation.map((s, idx) => {
                          const percentages = [35, 25, 20, 20];
                          const colorClasses = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-600">{s.segment} ({s.count} users)</span>
                                <span className="text-slate-700">Avg Credit: {Math.round(s.avg_credit)}</span>
                              </div>
                              <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-slate-200">
                                <div className={`${colorClasses[idx % 4]} h-full rounded-full`} style={{ width: `${percentages[idx % 4]}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>

                    <Card title="Income vs. Borrowing analysis" subtitle="Debt-to-Income (DTI) ratio check.">
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                        {borrowers.map(b => (
                          <div key={b.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-850 rounded-xl text-xs">
                            <div>
                              <p className="font-bold text-slate-700">{b.full_name}</p>
                              <p className="text-[10px] text-slate-500">Monthly Income: ${Number(b.monthly_income).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-slate-350">DTI: {Math.round((b.debt_to_income_ratio || 0.2) * 100)}%</p>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                (b.debt_to_income_ratio || 0.2) > 0.45 ? 'bg-rose-50 text-rose-600 border border-rose-900/20' : 'bg-emerald-950/40 text-emerald-600 border border-emerald-900/20'
                              }`}>
                                {(b.debt_to_income_ratio || 0.2) > 0.45 ? 'Over-borrowed' : 'Balanced'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  <Card title="Borrower Profiles & Historical Timeline" subtitle="Timeline lookup and profile management.">
                    <div className="flex gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Search borrower by name or National ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs text-slate-800 font-semibold"
                      />
                      <button
                        onClick={() => setIsBulkImportOpen(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        📥 Bulk Import
                      </button>
                      <button
                        onClick={() => setIsBorrowerModalOpen(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-755 cursor-pointer"
                      >
                        + Add Profile
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-left">
                        <thead className="bg-white/80 border-b border-slate-200 text-slate-450 font-bold uppercase">
                          <tr>
                            <th className="px-4 py-3">Borrower Name</th>
                            <th className="px-4 py-3">ID / Passport</th>
                            <th className="px-4 py-3">Region</th>
                            <th className="px-4 py-3">Segment</th>
                            <th className="px-4 py-3">Score</th>
                            <th className="px-4 py-3">DTI Ratio</th>
                            <th className="px-4 py-3">Doc Audit</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {filteredBorrowers.map(b => (
                            <tr key={b.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-semibold text-slate-700">{b.full_name}</td>
                              <td className="px-4 py-3 font-semibold text-slate-600">{b.national_id}</td>
                              <td className="px-4 py-3 text-slate-600">{b.region || '—'}</td>
                              <td className="px-4 py-3 text-slate-450">
                                <span className="bg-indigo-950/60 border border-indigo-900/30 text-indigo-400 font-bold px-2 py-0.5 rounded-full uppercase text-[9px]">
                                  {b.customer_segment || 'Salaried'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-bold text-indigo-450">{b.credit_score || '—'}</td>
                              <td className="px-4 py-3 text-slate-600">{Math.round((b.debt_to_income_ratio || 0.2) * 100)}%</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  b.document_verified === 'verified' ? 'bg-emerald-950/40 text-emerald-600 border border-emerald-900/20' :
                                  b.document_verified === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-900/20' :
                                  'bg-amber-950/40 text-amber-600 border border-amber-900/20'
                                }`}>
                                  {b.document_verified || 'pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3 flex gap-2">
                                <button
                                  onClick={() => handleOpenBorrowerProfile(b)}
                                  className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                                >
                                  View Profile
                                </button>
                                <span>|</span>
                                <button
                                  onClick={() => handleAssessEligibility(b.id, b.full_name)}
                                  className="text-[10px] text-indigo-400 font-bold hover:underline cursor-pointer"
                                >
                                  Assess Scoring
                                </button>
                                <span>|</span>
                                <button
                                  onClick={() => handleFetchRecommendations(b.id)}
                                  className="text-[10px] text-emerald-450 font-bold hover:underline cursor-pointer"
                                >
                                  Recommendation
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-200 text-xs text-slate-800">
                      <div className="flex items-center gap-2 text-slate-500">
                        <span>Rows per page:</span>
                        <select
                          value={borrowersLimit}
                          onChange={(e) => {
                            setBorrowersLimit(Number(e.target.value));
                            setBorrowersPage(1);
                          }}
                          className="px-2 py-1 bg-white border border-slate-250 rounded-lg outline-none cursor-pointer font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value={3}>3</option>
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                        </select>
                        <span className="ml-2">
                          Showing {Math.min(borrowersTotal, (borrowersPage - 1) * borrowersLimit + 1)} to {Math.min(borrowersTotal, borrowersPage * borrowersLimit)} of {borrowersTotal} records
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={borrowersPage === 1}
                          onClick={() => setBorrowersPage(prev => Math.max(1, prev - 1))}
                          className="px-3 py-1.5 border border-slate-250 bg-white hover:bg-slate-50 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-slate-700"
                        >
                          Previous
                        </button>
                        <span className="px-4 py-1.5 font-bold text-slate-700">
                          Page {borrowersPage} of {borrowersPages || 1}
                        </span>
                        <button
                          disabled={borrowersPage === borrowersPages}
                          onClick={() => setBorrowersPage(prev => Math.min(borrowersPages, prev + 1))}
                          className="px-3 py-1.5 border border-slate-250 bg-white hover:bg-slate-50 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-slate-700"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* PANEL 3: Geographic Borrowing Analysis */}
              {activePanel === 'geographic' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Interactive Risk Heatmap" subtitle="Lending volume clusters and repayment density." className="lg:col-span-2">
                      <div className="bg-slate-50/60 rounded-2xl p-6 border border-slate-90" style={{ minHeight: '340px' }} className="text-center relative overflow-hidden flex flex-col items-center justify-center">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest absolute top-4">SVG Geographical Distribution</p>
                        
                        <svg viewBox="0 0 400 300" className="w-full max-w-[340px] opacity-80 mt-6">
                          <path d="M150,110 L250,110 L220,180 L140,160 Z" fill="#6366f1" fillOpacity="0.85" stroke="#4f46e5" strokeWidth="2" />
                          <circle cx="190" cy="140" r="14" fill="#10b981" fillOpacity="0.7" className="animate-ping" />
                          <circle cx="190" cy="140" r="8" fill="#10b981" />

                          <path d="M250,110 L350,150 L320,230 L220,180 Z" fill="#3b82f6" fillOpacity="0.45" stroke="#2563eb" strokeWidth="2" />
                          <circle cx="280" cy="180" r="16" fill="#ef4444" fillOpacity="0.7" className="animate-ping" />
                          <circle cx="280" cy="180" r="8" fill="#ef4444" />

                          <path d="M50,80 L150,110 L140,160 L60,150 Z" fill="#8b5cf6" fillOpacity="0.65" stroke="#7c3aed" strokeWidth="2" />
                          <circle cx="100" cy="120" r="6" fill="#10b981" />

                          <path d="M100,20 L220,50 L250,110 L150,110 Z" fill="#ec4899" fillOpacity="0.55" stroke="#db2777" strokeWidth="2" />
                          <circle cx="180" cy="70" r="6" fill="#f59e0b" />
                        </svg>

                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-[10px] font-bold text-slate-600 bg-slate-50/85 px-4 py-2.5 rounded-xl border border-slate-850">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Safe (Nairobi/Kisumu)</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moderate (Nakuru)</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> High Risk Default (Mombasa)</span>
                        </div>
                      </div>
                    </Card>

                    <Card title="Regional Profitability Metrics" subtitle="Loan counts and repayment values by area.">
                      <div className="space-y-4">
                        {geographic.map((g, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-850 rounded-xl space-y-2 text-xs">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-slate-700 text-sm">{g.region}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                                g.riskLevel === 'high' ? 'bg-rose-50 text-rose-600 border border-rose-900/20' :
                                g.riskLevel === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-900/20' :
                                'bg-emerald-50 text-emerald-600 border border-emerald-900/20'
                              }`}>
                                {g.riskLevel.toUpperCase()} RISK
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-450">
                              <div>
                                <p>Volume: <span className="font-bold text-slate-700">${(g.totalBorrowed || 0).toLocaleString()}</span></p>
                                <p>Loan Count: <span className="font-bold text-slate-700">{g.loansCount}</span></p>
                              </div>
                              <div className="text-right">
                                <p>Repaid: <span className="font-bold text-slate-700">${(g.totalRepaid || 0).toLocaleString()}</span></p>
                                <p>Success: <span className="font-bold text-emerald-450">{g.repaymentSuccessRate}%</span></p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* PANEL 4: Loans Lifecycle */}
              {activePanel === 'loans' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      placeholder="Search active loan portfolios..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs text-white"
                    />
                    <button
                      onClick={() => setIsLoanModalOpen(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-755 cursor-pointer"
                    >
                      + Issue New Loan
                    </button>
                  </div>

                  <Card title="Loan Lifecycle & Tracking System" subtitle="Active loan statuses, workflow triggers, and manual stage gates.">
                    <div className="space-y-6">
                      {filteredLoans.map(l => (
                        <div key={l.id} className="p-4 bg-slate-50 border border-slate-850 rounded-2xl space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                              <p className="font-bold text-sm text-slate-800">{l.borrower_name}</p>
                              <p className="text-[10px] text-slate-500">
                                Product: <span className="font-bold text-slate-600">{l.loan_product || 'General Loan'}</span> | Purpose: {l.purpose || '—'}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-extrabold text-indigo-400 bg-indigo-950/60 border border-indigo-900/30 px-3 py-1 rounded-xl">
                                ${l.amount.toLocaleString()} ({l.interest_rate}% Int)
                              </span>
                              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-xl uppercase border ${
                                l.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-905' :
                                l.status === 'active' ? 'bg-blue-950/50 text-blue-400 border-blue-900' :
                                l.status === 'overdue' ? 'bg-rose-50 text-rose-600 border-rose-900' :
                                'bg-white text-slate-600 border-slate-200'
                              }`}>
                                {l.status}
                              </span>
                            </div>
                          </div>

                          {l.stage === 'declined' && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-850 animate-in fade-in duration-150">
                              <span className="font-bold">❌ Application DECLINED during committee internal underwriting audit. Client notified.</span>
                              <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase">DECLINED</span>
                            </div>
                          )}

                          {l.stage === 'defaulted' && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-850 animate-in fade-in duration-150">
                              <span className="font-bold">⚠️ Loan flagged in DEFAULT. Enforcement and manual recovery collection operations active.</span>
                              <span className="bg-amber-600 text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase">COLLECTIONS ACTIVE</span>
                            </div>
                          )}

                          <div className="grid grid-cols-5 gap-1.5 pt-2 text-center text-[10px] font-bold">
                            {[
                              { stage: 'application', label: '1. App Received' },
                              { stage: 'underwriting', label: '2. Auditing' },
                              { stage: 'approved', label: '3. Approved' },
                              { stage: 'disbursed', label: '4. Disbursed' },
                              { stage: 'repayment', label: '5. Repayment' }
                            ].map((step, idx) => {
                              const stagesOrder = ['application', 'underwriting', 'approved', 'disbursed', 'repayment', 'completed', 'defaulted'];
                              const currentIdx = stagesOrder.indexOf(l.stage);
                              const stepIdx = stagesOrder.indexOf(step.stage);
                              
                              const isCompleted = currentIdx >= stepIdx || l.stage === 'completed';
                              const isActive = l.stage === step.stage;

                              return (
                                <div key={idx} className="space-y-2">
                                  <div className={`h-2 rounded-full transition-all duration-300 ${
                                    isCompleted ? 'bg-emerald-500' : isActive ? 'bg-indigo-500' : 'bg-slate-200'
                                  }`} />
                                  <span className={isActive ? 'text-indigo-400 font-black' : isCompleted ? 'text-emerald-450' : 'text-slate-500'}>
                                    {step.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-850 justify-between text-xs">
                            <span className="text-[10px] text-slate-500 font-semibold">
                              Approved Date: {l.approved_at ? new Date(l.approved_at).toLocaleDateString() : 'N/A'}
                            </span>
                            
                             <div className="flex gap-2">
                              {l.stage === 'application' && (
                                <button
                                  onClick={() => handleLifecycleStage(l.id, 'underwriting')}
                                  className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-[10px] hover:bg-amber-700 cursor-pointer"
                                >
                                  Trigger Underwriting Audit
                                </button>
                              )}
                              {l.stage === 'underwriting' && (() => {
                                const borrower = borrowers.find(b => b.id === l.borrower_id);
                                if (!borrower) {
                                  return (
                                    <button
                                      onClick={() => handleLifecycleStage(l.id, 'approved')}
                                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px] hover:bg-indigo-700 cursor-pointer"
                                    >
                                      Approve Application
                                    </button>
                                  );
                                }

                                const getAuditReasons = (loan, b) => {
                                  const reasons = [];
                                  if ((b.credit_score || 0) < 600) {
                                    reasons.push({
                                      type: 'low_score',
                                      title: 'Low Credit Score',
                                      text: `Borrower credit score is ${b.credit_score || 'Pending'}, which is below the safe standard score of 600.`
                                    });
                                  }
                                  if ((b.debt_to_income_ratio || 0) > 0.40) {
                                    reasons.push({
                                      type: 'high_dti',
                                      title: 'High Debt-To-Income (DTI)',
                                      text: `Debt-to-Income ratio is ${Math.round((b.debt_to_income_ratio || 0.2) * 100)}%, exceeding the risk threshold of 40%.`
                                    });
                                  }
                                  if (b.document_verified === 'rejected') {
                                    reasons.push({
                                      type: 'doc_failed',
                                      title: 'Document Verification Rejected',
                                      text: `Identity verification documents were manually rejected by administrative gatekeepers.`
                                    });
                                  }
                                  const hasFraud = fraud && fraud.alerts && fraud.alerts.some(a => a.borrower_id === b.id);
                                  if (hasFraud) {
                                    reasons.push({
                                      type: 'fraud_flag',
                                      title: 'Automated Fraud Detection Alert',
                                      text: `Automated scans flagged duplicate identifiers or network IP collisions linked to this account.`
                                    });
                                  }
                                  return reasons;
                                };

                                const reasons = getAuditReasons(l, borrower);
                                if (reasons.length > 0) {
                                  return (
                                    <button
                                      onClick={() => setSelectedAuditLoan({ loan: l, borrower, reasons })}
                                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1.5 animate-pulse shadow-md shadow-amber-500/20"
                                    >
                                      ⚠️ Waiting for Internal Audit
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    onClick={() => handleLifecycleStage(l.id, 'approved')}
                                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px] hover:bg-indigo-700 cursor-pointer"
                                  >
                                    Approve Application
                                  </button>
                                );
                              })()}
                              {l.stage === 'declined' && (
                                <button
                                  onClick={() => handleLifecycleStage(l.id, 'underwriting')}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold text-[10px] hover:bg-blue-700 cursor-pointer shadow-sm"
                                >
                                  🔄 Re-Submit to Underwriting
                                </button>
                              )}
                              {l.stage === 'approved' && (
                                <button
                                  onClick={() => handleLifecycleStage(l.id, 'disbursed')}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[10px] hover:bg-emerald-700 cursor-pointer"
                                >
                                  Disburse Funds
                                </button>
                              )}
                              {l.stage === 'repayment' && (
                                <>
                                  <button
                                    onClick={() => handleLifecycleStage(l.id, 'completed')}
                                    className="px-3 py-1 bg-emerald-500 text-white rounded-lg font-bold text-[10px] hover:bg-emerald-600 cursor-pointer"
                                  >
                                    Mark Paid In Full
                                  </button>
                                  <button
                                    onClick={() => handleLifecycleStage(l.id, 'defaulted')}
                                    className="px-3 py-1 bg-rose-500 text-white rounded-lg font-bold text-[10px] hover:bg-rose-600 cursor-pointer"
                                  >
                                    Flag Default
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-200 text-xs text-slate-800">
                      <div className="flex items-center gap-2 text-slate-500">
                        <span>Rows per page:</span>
                        <select
                          value={loansLimit}
                          onChange={(e) => {
                            setLoansLimit(Number(e.target.value));
                            setLoansPage(1);
                          }}
                          className="px-2 py-1 bg-white border border-slate-250 rounded-lg outline-none cursor-pointer font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value={3}>3</option>
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                        </select>
                        <span className="ml-2">
                          Showing {Math.min(loansTotal, (loansPage - 1) * loansLimit + 1)} to {Math.min(loansTotal, loansPage * loansLimit)} of {loansTotal} records
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={loansPage === 1}
                          onClick={() => setLoansPage(prev => Math.max(1, prev - 1))}
                          className="px-3 py-1.5 border border-slate-250 bg-white hover:bg-slate-50 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-slate-700"
                        >
                          Previous
                        </button>
                        <span className="px-4 py-1.5 font-bold text-slate-700">
                          Page {loansPage} of {loansPages || 1}
                        </span>
                        <button
                          disabled={loansPage === loansPages}
                          onClick={() => setLoansPage(prev => Math.min(loansPages, prev + 1))}
                          className="px-3 py-1.5 border border-slate-250 bg-white hover:bg-slate-50 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-slate-700"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* PANEL 5: Repayments & Collections Manager */}
              {activePanel === 'repayments' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Repayment Risk & Overdue Predictions" subtitle="Heuristics modeling predicting default probability.">
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                        {repayments.defaultPredictions.length === 0 ? (
                          <p className="text-xs text-slate-500 py-3">All active borrowers scored in safety thresholds.</p>
                        ) : (
                          repayments.defaultPredictions.map((p, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-850 rounded-xl space-y-2 text-xs">
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-slate-700">{p.name}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  p.defaultProbability === 'high' ? 'bg-rose-955/50 text-rose-600 border border-rose-200' : 'bg-amber-955/50 text-amber-600 border border-amber-200'
                                }`}>
                                  {p.riskScore}% Default Risk
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-450 leading-normal">
                                <span className="font-bold text-slate-600">Trigger:</span> {p.triggerReason}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>

                    <Card title="Direct Repayment Simulator" subtitle="Perform manual payment collections.">
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-450">Select Active Loan</label>
                          <select
                            value={selectedSimLoanId}
                            onChange={(e) => setSelectedSimLoanId(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold outline-none bg-white"
                          >
                            <option value="">Choose Borrower Loan...</option>
                            {loans.filter(l => l.status === 'active' || l.status === 'overdue').map(l => (
                              <option key={l.id} value={l.id}>{l.borrower_name} — {l.loan_product} (${(l.amount - l.repaid_amount).toLocaleString()} due)</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-455">Repayment Amount ($)</label>
                          <input
                            type="number"
                            placeholder="Enter payment amount"
                            value={simPaymentAmount}
                            onChange={(e) => setSimPaymentAmount(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-955 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                          />
                        </div>
                        <button
                          onClick={() => handleSimulateRepayment(selectedSimLoanId, simPaymentAmount)}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-indigo-550"
                        >
                          Simulate Payment Entry
                        </button>
                      </div>
                    </Card>
                  </div>

                  <Card title="Collection & Recovery Management" subtitle="Overdue loan agent assignment and logs.">
                    <div className="space-y-6">
                      {repayments.collectionTasks.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-6">No collection tasks currently open in database.</p>
                      ) : (
                        repayments.collectionTasks.map(t => (
                          <div key={t.id} className="p-4 bg-slate-50 border border-slate-850 rounded-2xl space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                              <div>
                                <p className="font-bold text-slate-700 text-sm">{t.borrower_name} ({t.phone_number})</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Product: {t.loan_product} | Balance Overdue: <span className="font-bold text-rose-455">${t.loan_amount - t.repaid_amount}</span></p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-450 text-[10px]">Assignee: {t.assignee || 'Admin'}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  t.recovery_status === 'recovered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  t.recovery_status === 'contacted' ? 'bg-amber-955/50 text-amber-600 border border-amber-200' :
                                  'bg-rose-955/50 text-rose-600 border border-rose-200'
                                }`}>
                                  {t.recovery_status.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-850 rounded-xl p-3 text-xs leading-relaxed text-slate-600">
                              <span className="font-bold text-slate-700 block mb-1">Latest Communication Log:</span>
                              {t.notes || 'No recovery contacts documented yet.'}
                              <p className="text-[9px] text-slate-500 mt-2">Last Contact: {t.last_contact_date ? new Date(t.last_contact_date).toLocaleDateString() : 'N/A'}</p>
                            </div>

                            {t.recovery_status !== 'recovered' && (
                              <div className="pt-2 border-t border-slate-200 space-y-3">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Add Recovery Contact Updates</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <input
                                    type="text"
                                    placeholder="Document call outcome..."
                                    value={collectionNotes}
                                    onChange={(e) => setCollectionNotes(e.target.value)}
                                    className="sm:col-span-2 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50 text-slate-800 font-semibold"
                                  />
                                  <select
                                    value={collectionStatus}
                                    onChange={(e) => setCollectionStatus(e.target.value)}
                                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 font-semibold outline-none bg-white"
                                  >
                                    <option value="contacted">Contacted</option>
                                    <option value="promised_payment">Promised Payment</option>
                                    <option value="uncollectible">Uncollectible / Severe Default</option>
                                  </select>
                                </div>
                                <button
                                  onClick={() => handleAddCollectionNote(t.id, t.borrower_name)}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  Submit Recovery Logs
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* PANEL 6: Product Performance & Recommendations */}
              {activePanel === 'products' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <Card title="AI Loan Recommendation Engine" subtitle="Input borrower data to query automated credit fitment recommendations.">
                    <div className="flex gap-4 mb-4">
                      <select
                        onChange={(e) => handleFetchRecommendations(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl text-xs outline-none"
                      >
                        <option value="">Select Borrower to analyze recommendations...</option>
                        {borrowers.map(b => (
                          <option key={b.id} value={b.id}>{b.full_name} (Credit Score: {b.credit_score || 'Pending'})</option>
                        ))}
                      </select>
                    </div>

                    {recLoading ? (
                      <p className="text-xs text-slate-600 animate-pulse py-2">Consulting ML recommendation models...</p>
                    ) : recEngineData ? (
                      <div className="bg-slate-50 border border-slate-850 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center text-xs border-b border-slate-200 pb-2">
                          <p className="font-bold text-slate-700">Results for: {recEngineData.borrower.name}</p>
                          <p className="text-slate-450">Credit Score: <span className="font-bold text-indigo-400">{recEngineData.borrower.score}</span></p>
                        </div>
                        {recEngineData.recommendations.map((rec, i) => (
                          <div key={i} className="bg-white border border-slate-850 rounded-xl p-3 space-y-1.5 text-xs shadow-sm">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-indigo-400 text-sm">{rec.product}</span>
                              <span className="text-emerald-450">{rec.interestRate}% Interest</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                              <span>Recommended Limit: {rec.amountRange}</span>
                              <span>Maturity: {rec.period}</span>
                            </div>
                            <p className="text-[10px] text-slate-600 leading-normal bg-slate-50 p-2 rounded-lg mt-1 border border-slate-850">
                              <span className="font-bold text-slate-250">Rationale:</span> {rec.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-2">Select a registered user profile to evaluate recommended offerings.</p>
                    )}
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Loan Product Performance Analysis" subtitle="Repayment rates & profitability metrics." className="lg:col-span-2">
                      <div className="space-y-4 pt-2">
                        {aiPredictions && aiPredictions.productPerformance.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-6">No performance statistics accumulated.</p>
                        ) : (
                          aiPredictions && aiPredictions.productPerformance.map((p, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-850 rounded-xl space-y-2 text-xs">
                              <div className="flex justify-between font-bold items-center">
                                <span className="text-slate-250 text-sm">{p.product}</span>
                                <span className="text-slate-500 text-[10px]">{p.issuedCount} Loans Issued</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Disbursed: ${(p.disbursed || 0).toLocaleString()}</span>
                                <span>Repaid: ${(p.repaid || 0).toLocaleString()}</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold">
                                  <span className="text-indigo-400">Accrued Profit: ${(p.estimatedInterest || 0).toLocaleString()}</span>
                                  <span className="text-emerald-450">Repayment Rate: {p.repaymentRate}%</span>
                                </div>
                                <div className="w-full bg-slate-50 border border-slate-850 h-2 rounded-full overflow-hidden">
                                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${p.repaymentRate}%` }} />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>

                    <Card title="Borrowing Demand Forecasting" subtitle="Projected application volume trend.">
                      <div className="bg-slate-50/60 text-indigo-400 p-4 rounded-xl font-mono text-[11px] leading-relaxed select-none relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1.5 mb-2">Demand Forecast Model</p>
                        
                        <svg viewBox="0 0 160 80" className="w-full opacity-70">
                          <line x1="0" y1="20" x2="160" y2="20" stroke="#1e293b" strokeWidth="0.5" />
                          <line x1="0" y1="40" x2="160" y2="40" stroke="#1e293b" strokeWidth="0.5" />
                          <line x1="0" y1="60" x2="160" y2="60" stroke="#1e293b" strokeWidth="0.5" />

                          <path d="M 0 70 L 25 65 L 50 55 L 75 40 L 100 35 L 125 22 L 150 15 L 150 80 L 0 80 Z" fill="#6366f1" fillOpacity="0.15" />
                          <path d="M 0 70 L 25 65 L 50 55 L 75 40 L 100 35 L 125 22 L 150 15" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
                          
                          <circle cx="125" cy="22" r="3.5" fill="#f59e0b" />
                          <circle cx="150" cy="15" r="3.5" fill="#10b981" />
                        </svg>

                        <div className="flex justify-between items-center text-[9px] text-slate-500 border-t border-slate-200 pt-1.5 mt-2 font-bold uppercase">
                          <span>Q2 Actuals</span>
                          <span className="text-emerald-600">Q3 Proj +18.2%</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* PANEL 7: Security & Verifier (Doc audit & Fraud scanners) */}
              {activePanel === 'security' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Automated Fraud Detection Center" subtitle="Duplicate credentials, device footprint sharing, or IP collisions.">
                      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                        {fraud.alerts.length === 0 && fraud.ipCollisions.length === 0 ? (
                          <p className="text-xs text-slate-500 py-3">No active threat alerts in system database.</p>
                        ) : (
                          <>
                            {fraud.alerts.map(a => (
                              <div key={a.id} className="p-3 bg-slate-50 border border-slate-850 rounded-xl space-y-2 text-xs">
                                <div className="flex justify-between items-center font-bold">
                                  <span className="text-slate-700">{a.full_name}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                                    a.risk_level === 'high' ? 'bg-rose-955/50 text-rose-455 border border-rose-200' : 'bg-amber-955/50 text-amber-455 border border-amber-200'
                                  }`}>
                                    {a.risk_level} risk
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-450"><span className="font-bold text-slate-350">Scan Finding:</span> {a.reason}</p>
                              </div>
                            ))}

                            {fraud.ipCollisions.map((ip, i) => (
                              <div key={i} className="p-3 bg-rose-955/20 border border-rose-200 rounded-xl space-y-1.5 text-xs">
                                <div className="flex justify-between items-center font-bold text-rose-600">
                                  <span>Hardware MAC / IP collision</span>
                                  <span className="bg-rose-950 text-rose-300 px-2 py-0.5 rounded-full text-[8px] font-bold border border-rose-800">THREAT ALERT</span>
                                </div>
                                <p className="text-[10px] text-slate-700 font-semibold">IP Address: {ip.ip}</p>
                                <p className="text-[10px] text-slate-450"><span className="font-bold">Matching Profiles:</span> {ip.borrowers}</p>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </Card>

                    <Card title="Document Verification Hub" subtitle="Audit uploaded IDs and Pay slips.">
                      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                        {borrowers.length === 0 ? (
                          <p className="text-xs text-slate-500 py-3">No profiles listed to evaluate documents.</p>
                        ) : (
                          borrowers.map(b => (
                            <div key={b.id} className="p-3 bg-slate-50 border border-slate-850 rounded-xl text-xs space-y-3">
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-slate-700">{b.full_name}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                                  b.document_verified === 'verified' ? 'bg-emerald-50 text-emerald-600 border border-emerald-900/20' :
                                  b.document_verified === 'rejected' ? 'bg-rose-955/50 text-rose-600 border border-rose-900/20' :
                                  'bg-amber-955/50 text-amber-600 border border-amber-900/20'
                                }`}>
                                  {b.document_verified || 'pending'}
                                </span>
                              </div>

                              <div className="text-[10px] text-slate-450 space-y-1">
                                <p>National ID: <span className="font-semibold text-slate-700">{b.national_id}</span></p>
                                <p className="flex items-center gap-1.5">
                                  File: <span className="font-semibold text-slate-700">{b.id_document_path ? b.id_document_path.replace('/uploads/', '') : 'No ID Uploaded'}</span>
                                  {b.id_document_path && (
                                    <a
                                      href={`http://localhost:5000/api/borrowers/document/${encodeURIComponent(b.id_document_path.replace('/uploads/', ''))}?token=admin_session`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-indigo-600 hover:text-indigo-500 hover:underline font-bold"
                                    >
                                      [View Securely]
                                    </a>
                                  )}
                                </p>
                                {b.document_notes && <p className="bg-slate-50 p-2 rounded-lg border border-slate-850 mt-1"><span className="font-bold text-slate-700">Audit Notes:</span> {b.document_notes}</p>}
                              </div>

                              {/* Action controls & notes input */}
                              <div className="pt-2 border-t border-slate-200 space-y-2">
                                {b.document_verified === 'pending' || !b.document_verified ? (
                                  <>
                                    <input
                                      type="text"
                                      placeholder="Provide audit notes/rejection reason..."
                                      value={borrowerAuditNotes[b.id] || ''}
                                      onChange={(e) => setBorrowerAuditNotes(prev => ({ ...prev, [b.id]: e.target.value }))}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[10px] outline-none bg-white text-slate-800 font-semibold"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleVerifyDocument(b.id, 'verified', borrowerAuditNotes[b.id] || '')}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[9px] cursor-pointer"
                                      >
                                        Approve Document
                                      </button>
                                      <button
                                        onClick={() => handleVerifyDocument(b.id, 'rejected', borrowerAuditNotes[b.id] || '')}
                                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[9px] cursor-pointer"
                                      >
                                        Reject ID
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex justify-between items-center bg-slate-100 p-2 rounded-lg border border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-555">Audit Finalized</span>
                                    <button
                                      onClick={() => handleVerifyDocument(b.id, 'pending', 'Resetting verification status for re-evaluation.')}
                                      className="px-2 py-0.5 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded text-[8px] font-bold cursor-pointer transition shadow-sm"
                                    >
                                      🔄 Re-Audit / Reset
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  </div>

                  <Card title="Live API Integrations Console" subtitle="Real-time terminal logs mapping third party payout webhooks.">
                    <div className="bg-slate-50 text-indigo-400 p-4 rounded-xl font-mono text-[11px] leading-relaxed h-[220px] overflow-y-auto select-none border border-slate-200 shadow-inner">
                      <div className="space-y-1">
                        <p className="text-slate-650 border-b border-slate-200 pb-1 mb-2">// Listeners: SMS Gateway, Credit scoring registers active...</p>
                        {apiLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-slate-600">[{new Date(log.time).toLocaleTimeString()}]</span>
                            <span className="text-amber-500 font-bold">[{log.type}]</span>
                            <span className={log.status === 'SUCCESS' || log.status === 'SENT' || log.status === 'COMPLETED' ? 'text-emerald-450 font-bold' : 'text-rose-455 font-bold'}>
                              [{log.status}]
                            </span>
                            <span className="text-slate-700">{log.message}</span>
                          </div>
                        ))}
                        <div ref={terminalEndRef} />
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* PANEL 8: Security & Accountability Audit Logs (NEW) */}
              {activePanel === 'audit_logs' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <Card title="Administrative Audit Logs Ledger" subtitle="Accountability timeline tracking every administrative change, document verification, payment simulation, and reset.">
                    <div className="overflow-x-auto rounded-xl border border-slate-850">
                      <table className="min-w-full text-xs text-left">
                        <thead className="bg-white text-slate-600 font-bold uppercase border-b border-slate-850">
                          <tr>
                            <th className="px-4 py-3">Timestamp</th>
                            <th className="px-4 py-3">Actor / Email</th>
                            <th className="px-4 py-3">Action Gate</th>
                            <th className="px-4 py-3">Audit Details</th>
                            <th className="px-4 py-3">Client IP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 bg-slate-50/40">
                          {auditLogs.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No administrative logs recorded in history table.</td>
                            </tr>
                          ) : (
                            auditLogs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-slate-500 font-semibold font-mono whitespace-nowrap">
                                  {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">{log.user_email}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                    log.action === 'SYSTEM_RESET' ? 'bg-rose-955/50 border-rose-800 text-rose-600' :
                                    log.action === 'REPAYMENT_SIMULATION' ? 'bg-emerald-955/50 border-emerald-800 text-emerald-600' :
                                    log.action === 'LIFECYCLE_MIGRATION' ? 'bg-blue-955/50 border-blue-800 text-blue-400' :
                                    'bg-white border-slate-200 text-slate-700'
                                  }`}>
                                    {log.action}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-350 leading-normal max-w-sm">{log.details}</td>
                                <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{log.ip_address}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* PANEL 9: System Settings (NEW) */}
              {activePanel === 'settings' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Dynamic API Integrations Management Console */}
                    <Card title="Live API Integrations Manager" subtitle="Create, edit, delete, and configure database-backed third-party payment gateways, SMS sender channels, and risk engines.">
                      <div className="space-y-4">
                        {integrationsList.length === 0 ? (
                          <p className="text-xs text-slate-450 italic text-center py-4 bg-slate-50 rounded-xl">No active third party integrations deployed.</p>
                        ) : (
                          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto pr-1">
                            {integrationsList.map(integration => (
                              <div key={integration.id} className="py-3 flex flex-col gap-2.5">
                                {editingIntegrationId === integration.id ? (
                                  <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-450 uppercase">Gateway Name</label>
                                        <input
                                          type="text"
                                          value={editingIntegrationData.name}
                                          onChange={(e) => setEditingIntegrationData(prev => ({ ...prev, name: e.target.value }))}
                                          className="w-full bg-white border border-slate-350 rounded-xl px-2.5 py-1 text-xs text-slate-800 font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-450 uppercase">Gateway Key/Token</label>
                                        <input
                                          type="text"
                                          value={editingIntegrationData.key_value}
                                          onChange={(e) => setEditingIntegrationData(prev => ({ ...prev, key_value: e.target.value }))}
                                          className="w-full bg-white border border-slate-350 rounded-xl px-2.5 py-1 text-xs text-slate-800 font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-450 uppercase">Status:</span>
                                        <select
                                          value={editingIntegrationData.status}
                                          onChange={(e) => setEditingIntegrationData(prev => ({ ...prev, status: e.target.value }))}
                                          className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 outline-none"
                                        >
                                          <option value="online">ONLINE</option>
                                          <option value="offline">OFFLINE</option>
                                        </select>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => setEditingIntegrationId(null)}
                                          className="px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-650 font-bold rounded-lg text-[10px] cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => handleUpdateIntegration(integration.id)}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center bg-slate-50/50 hover:bg-slate-55 p-3 rounded-2xl border border-slate-100 transition">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{integration.name}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase ${
                                          integration.status === 'online'
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-950/10'
                                            : 'bg-rose-50 text-rose-605 border border-rose-950/10'
                                        }`}>
                                          {integration.status}
                                        </span>
                                      </div>
                                      <p className="font-mono text-[10px] text-slate-450 select-all truncate max-w-[200px]" title={integration.key_value}>
                                        {integration.key_value}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleToggleDbIntegration(integration)}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase border transition-all cursor-pointer ${
                                          integration.status === 'online'
                                            ? 'bg-emerald-50 border-emerald-250 text-emerald-600 hover:bg-emerald-100'
                                            : 'bg-rose-50 border-rose-250 text-rose-600 hover:bg-rose-100'
                                        }`}
                                      >
                                        {integration.status === 'online' ? 'Disable' : 'Enable'}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingIntegrationId(integration.id);
                                          setEditingIntegrationData({
                                            name: integration.name,
                                            key_value: integration.key_value,
                                            status: integration.status
                                          });
                                        }}
                                        className="p-1 text-slate-450 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                                        title="Edit Key"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() => handleDeleteIntegration(integration.id, integration.name)}
                                        className="p-1 text-rose-450 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                        title="Delete Deployed Integration"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Deploy New API Integration Gateway form */}
                    <div className="space-y-6">
                      <Card title="Deploy New API Gateway" subtitle="Register a new third-party provider credentials token and configure its system callback status.">
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-450 uppercase">Gateway Name</label>
                            <input
                              type="text"
                              placeholder="e.g. stripe, sendgrid, Twilio"
                              value={newIntegrationData.name}
                              onChange={(e) => setNewIntegrationData(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-450 uppercase">Gateway Client Key / Auth Token</label>
                            <input
                              type="text"
                              placeholder="e.g. api_token_auth_8312d93e1102"
                              value={newIntegrationData.key_value}
                              onChange={(e) => setNewIntegrationData(prev => ({ ...prev, key_value: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-450 uppercase">Initial Status State</label>
                            <select
                              value={newIntegrationData.status}
                              onChange={(e) => setNewIntegrationData(prev => ({ ...prev, status: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold outline-none"
                            >
                              <option value="online">ONLINE</option>
                              <option value="offline">OFFLINE</option>
                            </select>
                          </div>
                          <button
                            onClick={handleCreateIntegration}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-xs font-bold text-white cursor-pointer shadow-sm transition"
                          >
                            🔌 Deploy Integration Gateway
                          </button>
                        </div>
                      </Card>

                      <Card title="Database Backups & Snapshot Engine" subtitle="Export or Restore SQL dumps of active accounts.">
                        <div className="space-y-4">
                          {backupLoading ? (
                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                                <span>Compiling Database SQL Backup Dump...</span>
                                <span>{backupProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-50 border border-slate-850 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-indigo-650 h-full rounded-full transition-all" style={{ width: `${backupProgress}%` }} />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              <button
                                onClick={handleTriggerBackup}
                                className="py-3 bg-slate-50 border border-slate-200 hover:bg-white rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
                              >
                                <span>📥</span>
                                <span>Export DB Snapshot</span>
                              </button>
                              
                              <button
                                onClick={() => {
                                  showToast('Simulated DB restore point processed successfully.');
                                  logApiActivity('BACKUP', 'RESTORE', 'Triggered system restore checkpoint recovery from snapshot.');
                                  loadAllData();
                                }}
                                className="py-3 bg-slate-50 border border-slate-200 hover:bg-white rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
                              >
                                <span>🔄</span>
                                <span>Restore Snapshot</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* NUCLEAR FRESH INSTALL BUTTON */}
                  <Card title="System Deployment Tools (Nuclear Reset)" subtitle="Clean ledger files and restart the environment.">
                    <div className="p-4 bg-rose-955/20 border border-rose-200 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Execute System Fresh Install Wipes</p>
                        <p className="text-[10px] text-slate-600 leading-normal max-w-lg">
                          Clears all registered borrower accounts, loan applications, payment installments, active collections, and alert histories. <span className="font-bold text-rose-455">Keeps all admin users and credentials intact.</span> Essential for provisioning a fresh client workspace.
                        </p>
                      </div>
                      
                      <button
                        onClick={() => setIsResetConfirmOpen(true)}
                        className="px-5 py-3 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer shadow-xl shadow-rose-950/20"
                      >
                        Nuclear Fresh Install
                      </button>
                    </div>
                  </Card>
                </div>
              )}

              {/* PANEL 10: Export & Reporting */}
              {activePanel === 'exports' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card title="Loans Portfolio Report" subtitle="CSV report detailing entire active loan ledger, repayments, stages, and due dates.">
                      <button
                        onClick={() => handleExportData('loans')}
                        className="w-full py-3 bg-indigo-650 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all cursor-pointer mt-4 border border-indigo-600"
                      >
                        Export Loans Ledger (.CSV)
                      </button>
                    </Card>
                    <Card title="Borrowers Analytics Report" subtitle="CSV report aggregating customer profiles, incomes, savings, credit ratings, segments, and DTI.">
                      <button
                        onClick={() => handleExportData('borrowers')}
                        className="w-full py-3 bg-indigo-650 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all cursor-pointer mt-4 border border-indigo-600"
                      >
                        Export Borrower Data (.CSV)
                      </button>
                    </Card>
                    <Card title="Regional Profitability Analysis" subtitle="CSV report illustrating lending densities, geographical defaults, and recovery rates.">
                      <button
                        onClick={() => handleExportData('regional')}
                        className="w-full py-3 bg-indigo-650 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all cursor-pointer mt-4 border border-indigo-600"
                      >
                        Export Profitability Analysis (.CSV)
                      </button>
                    </Card>
                  </div>
                </div>
              )}

              {/* PANEL 11: Mobile Viewport Simulator */}
              {activePanel === 'simulator' && (
                <div className="space-y-6 flex flex-col items-center animate-in fade-in duration-200">
                  <div className="w-full max-w-lg mb-4 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Simulation Profile Configurator</p>
                    <select
                      value={mobileBorrowerId}
                      onChange={(e) => setMobileBorrowerId(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-800 outline-none font-bold shadow-sm"
                    >
                      {borrowers.map(b => (
                        <option key={b.id} value={b.id}>Test Client App As: {b.full_name} ({b.customer_segment || 'Salaried'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-[310px] h-[610px] bg-slate-50 rounded-[40px] p-3 shadow-2xl border-4 border-slate-200 flex flex-col relative">
                    <div className="w-32 h-4 bg-slate-50 absolute top-3 left-1/2 -translate-x-1/2 rounded-b-xl z-20 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-850" />
                    </div>
                    
                    <div className="flex-1 bg-white rounded-[30px] overflow-hidden flex flex-col relative z-10 text-white p-4 pt-6 select-none">
                      
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-600 px-1 mb-4 select-none">
                        <span>9:41 AM</span>
                        <div className="flex items-center gap-1">
                          <span>📶 5G</span>
                          <span>🔋 100%</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Welcome Back</p>
                          <p className="text-xs font-bold text-slate-800">
                            {borrowers.find(b => b.id === Number(mobileBorrowerId))?.full_name || 'Guest User'}
                          </p>
                        </div>
                        <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-xs border border-indigo-500/35 shadow-md">
                          {borrowers.find(b => b.id === Number(mobileBorrowerId))?.full_name?.charAt(0) || 'G'}
                        </div>
                      </div>

                      {mobileLoan ? (
                        <div className="bg-indigo-600 border border-indigo-500/25 rounded-2xl p-4 shadow-lg shadow-indigo-950/50 space-y-3">
                          <div>
                            <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest">{mobileLoan.loan_product}</p>
                            <p className="text-xl font-extrabold tracking-tight mt-0.5">
                              ${(mobileLoan.amount - mobileLoan.repaid_amount).toLocaleString()}
                            </p>
                            <p className="text-[8px] text-indigo-200">Total Outstanding Balance</p>
                          </div>
                          
                          <div className="flex justify-between text-[9px] font-bold text-indigo-100 pt-2 border-t border-indigo-500">
                            <span>Due: {new Date(mobileLoan.due_date).toLocaleDateString()}</span>
                            <span>Int: {mobileLoan.interest_rate}%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-850 rounded-2xl p-6 text-center shadow-md space-y-2 border border-slate-200">
                          <p className="text-xs font-bold text-slate-600">No Active Borrowings</p>
                          <p className="text-[10px] text-slate-500 leading-relaxed">Submit a new application on the admin panel to evaluate client portal listings.</p>
                        </div>
                      )}

                      {mobileLoan && (
                        <form onSubmit={handleMobileRepaymentSubmit} className="mt-4 bg-slate-850 border border-slate-200 rounded-2xl p-3 space-y-3">
                          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">// Instant Mobile Payment (M-Pesa)</p>
                          <div className="space-y-1">
                            <input
                              type="number"
                              placeholder="Amount to pay"
                              value={mobilePaymentSimAmount}
                              onChange={(e) => setMobilePaymentSimAmount(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-650 outline-none focus:border-indigo-500"
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full bg-indigo-650 hover:bg-indigo-500 text-white rounded-lg py-1.5 text-[10px] font-extrabold transition-all cursor-pointer"
                          >
                            Pay Balance Instantly
                          </button>
                        </form>
                      )}

                      <div className="mt-4 flex-1 flex flex-col min-h-0">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Notifications & Reminders</p>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                          {mobileNotifFeed.map(n => (
                            <div key={n.id} className="bg-slate-850 border border-slate-200 p-2.5 rounded-xl space-y-0.5">
                              <div className="flex justify-between text-[9px] font-bold">
                                <span className="text-slate-700">{n.title}</span>
                                <span className="text-slate-500">{n.time}</span>
                              </div>
                              <p className="text-[9px] text-slate-600 leading-normal">{n.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </main>
      </div>

      {/* CONFIRM RESET / FRESH INSTALL DIALOG MODAL (NEW) */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50/70 backdrop-blur-sm">
          <div className="bg-white border border-rose-900/35 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-rose-955/20 border-b border-rose-900/20 flex justify-between items-center">
              <h3 className="text-sm font-bold text-rose-600 uppercase tracking-widest">⚠️ Nuclear Reset Confirmation</h3>
              <button onClick={() => { setIsResetConfirmOpen(false); setResetConfirmText(''); }} className="text-slate-600 hover:text-slate-700 font-extrabold cursor-pointer">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-350 leading-relaxed">
                You are about to execute a <span className="font-bold text-rose-455">System Fresh Install</span>. Wiping borrower profiles, active loans, repayment ledgers, and recovery timelines from SQLite databases. Administrative login profiles will be preserved.
              </p>
              
              <div className="bg-rose-955/10 border border-rose-900/20 p-3 rounded-xl">
                <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest mb-1">To verify execution:</p>
                <p className="text-xs text-slate-600">Please type <span className="font-mono font-bold text-rose-600 select-all bg-rose-955 px-1 py-0.5 rounded border border-rose-200">CONFIRM</span> below:</p>
              </div>

              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 outline-none focus:border-rose-900"
                placeholder="Type CONFIRM to wipe operational data"
              />

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setIsResetConfirmOpen(false); setResetConfirmText(''); }}
                  className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNuclearWipeExecute}
                  disabled={resetLoading || resetConfirmText !== 'CONFIRM'}
                  className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:bg-rose-900/30 disabled:text-rose-600/50 rounded-xl text-xs font-bold text-white transition-all cursor-pointer whitespace-nowrap"
                >
                  {resetLoading ? 'Wiping Databases...' : 'Execute Fresh Install'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Issue Loan Modal */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Issue Loan Application</h3>
              <button onClick={() => setIsLoanModalOpen(false)} className="text-slate-450 hover:text-slate-700 font-extrabold cursor-pointer">×</button>
            </div>
            <form onSubmit={handleCreateLoanSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Select Borrower</label>
                <select
                  value={newLoanData.borrower_id}
                  onChange={(e) => setNewLoanData(prev => ({ ...prev, borrower_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none"
                >
                  <option value="">Choose Borrower...</option>
                  {borrowers.map(b => (
                    <option key={b.id} value={b.id}>{b.full_name} ({b.national_id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Amount ($)</label>
                  <input
                    type="number"
                    required
                    value={newLoanData.amount}
                    onChange={(e) => setNewLoanData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Interest (%)</label>
                  <input
                    type="number"
                    required
                    value={newLoanData.interest_rate}
                    onChange={(e) => setNewLoanData(prev => ({ ...prev, interest_rate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Period (months)</label>
                  <input
                    type="number"
                    required
                    value={newLoanData.repayment_period}
                    onChange={(e) => setNewLoanData(prev => ({ ...prev, repayment_period: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Product Type</label>
                  <select
                    value={newLoanData.loan_product}
                    onChange={(e) => setNewLoanData(prev => ({ ...prev, loan_product: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none"
                  >
                    <option value="Personal Advance">Personal Advance</option>
                    <option value="Business Expansion Loan">Business Expansion</option>
                    <option value="Emergency Cash Loan">Emergency Cash</option>
                    <option value="Elite Premium Loan">Elite Premium</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Purpose</label>
                <input
                  type="text"
                  required
                  value={newLoanData.purpose}
                  onChange={(e) => setNewLoanData(prev => ({ ...prev, purpose: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all mt-2 cursor-pointer border border-indigo-550"
              >
                File Application Stage
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Borrower Modal */}
      {isBorrowerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Add Borrower Profile</h3>
              <button onClick={() => setIsBorrowerModalOpen(false)} className="text-slate-450 hover:text-slate-700 font-extrabold cursor-pointer">×</button>
            </div>
            <form onSubmit={handleCreateBorrowerSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newBorrowerData.full_name}
                    onChange={(e) => setNewBorrowerData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">National ID *</label>
                  <input
                    type="text"
                    required
                    value={newBorrowerData.national_id}
                    onChange={(e) => setNewBorrowerData(prev => ({ ...prev, national_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Phone *</label>
                  <input
                    type="text"
                    required
                    value={newBorrowerData.phone_number}
                    onChange={(e) => setNewBorrowerData(prev => ({ ...prev, phone_number: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Residential Address</label>
                  <input
                    type="text"
                    value={newBorrowerData.address}
                    onChange={(e) => setNewBorrowerData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Region</label>
                  <select
                    value={newBorrowerData.region}
                    onChange={(e) => setNewBorrowerData(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold outline-none"
                  >
                    <option value="Nairobi">Nairobi</option>
                    <option value="Kisumu">Kisumu</option>
                    <option value="Mombasa">Mombasa</option>
                    <option value="Nakuru">Nakuru</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Date of Birth</label>
                  <input
                    type="date"
                    value={newBorrowerData.date_of_birth}
                    onChange={(e) => setNewBorrowerData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Gender</label>
                  <select
                    value={newBorrowerData.gender}
                    onChange={(e) => setNewBorrowerData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Occupation</label>
                  <input
                    type="text"
                    value={newBorrowerData.occupation}
                    onChange={(e) => setNewBorrowerData(prev => ({ ...prev, occupation: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Employer / Co.</label>
                  <input
                    type="text"
                    value={newBorrowerData.employer}
                    onChange={(e) => setNewBorrowerData(prev => ({ ...prev, employer: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Monthly Income ($)</label>
                  <input
                    type="number"
                    value={newBorrowerData.monthly_income}
                    onChange={(e) => setNewBorrowerData(prev => ({ ...prev, monthly_income: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Savings Balance ($)</label>
                  <input
                    type="number"
                    value={newBorrowerData.savings_balance}
                    onChange={(e) => setNewBorrowerData(prev => ({ ...prev, savings_balance: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all mt-2 cursor-pointer border border-indigo-550"
              >
                Register Borrower Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bulk Import Borrowers Modal */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <span>📥</span> Bulk Import Borrower Profiles
              </h3>
              <button 
                onClick={() => {
                  setIsBulkImportOpen(false);
                  setBulkParsedData([]);
                  setBulkCsvText('');
                  setBulkImportSummary(null);
                }} 
                className="text-slate-450 hover:text-slate-700 font-extrabold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setBulkTab('template')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition ${bulkTab === 'template' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  1. Template & Guide
                </button>
                <button
                  type="button"
                  onClick={() => setBulkTab('file')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition ${bulkTab === 'file' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  2. Upload CSV File
                </button>
                <button
                  type="button"
                  onClick={() => setBulkTab('text')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition ${bulkTab === 'text' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  3. Paste Raw CSV
                </button>
                {bulkParsedData.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBulkTab('preview')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition ${bulkTab === 'preview' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    4. Data Preview ({bulkParsedData.length})
                  </button>
                )}
              </div>

              {/* Tab 1: Template */}
              {bulkTab === 'template' && (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                    <p className="font-bold text-slate-800">Standard CSV Guidelines:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      <li>Required columns: <span className="font-semibold text-slate-800">full_name</span>, <span className="font-semibold text-slate-800">phone_number</span>, <span className="font-semibold text-slate-800">national_id</span></li>
                      <li>Optional: <span className="font-semibold">address, region, date_of_birth, gender, email, occupation, employer, monthly_income, savings_balance, collateral_info</span></li>
                      <li>Values containing commas must be surrounded in double quotes (e.g. <span className="italic">"Kilimani, Nairobi"</span>).</li>
                      <li>Existing National ID values in the ledger will be automatically skipped to prevent duplication.</li>
                    </ul>
                  </div>
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadCsvTemplate}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition flex items-center gap-2"
                    >
                      💾 Download Excel / CSV Template
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: File Upload */}
              {bulkTab === 'file' && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl p-8 text-center cursor-pointer transition bg-slate-50/50"
                >
                  <div className="space-y-2">
                    <div className="text-3xl">📁</div>
                    <p className="text-xs font-bold text-slate-700">Drag and drop your borrower CSV file here</p>
                    <p className="text-[10px] text-slate-400">or click to choose a file from your device</p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="bulk-file-upload-input"
                    />
                    <label
                      htmlFor="bulk-file-upload-input"
                      className="inline-block mt-3 px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl text-[11px] font-bold cursor-pointer transition shadow-sm"
                    >
                      Select File
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 3: Paste CSV */}
              {bulkTab === 'text' && (
                <div className="space-y-3">
                  <textarea
                    rows={6}
                    placeholder="full_name,phone_number,national_id,monthly_income,region&#10;Alice Kamau,+254 712 345 678,31245678,6800,Nairobi&#10;Bernard Ochieng,+254 733 456 789,28456123,2400,Kisumu"
                    value={bulkCsvText}
                    onChange={(e) => {
                      setBulkCsvText(e.target.value);
                      const parsed = parseCsvText(e.target.value);
                      setBulkParsedData(parsed);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                  {bulkParsedData.length > 0 && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setBulkTab('preview')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition"
                      >
                        Proceed to Data Preview →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Preview Grid */}
              {bulkTab === 'preview' && bulkParsedData.length > 0 && (
                <div className="space-y-3">
                  <div className="max-h-[220px] overflow-y-auto border border-slate-200 rounded-2xl">
                    <table className="min-w-full text-[10px] text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">National ID</th>
                          <th className="px-3 py-2">Phone</th>
                          <th className="px-3 py-2">Monthly Income</th>
                          <th className="px-3 py-2">Region</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bulkParsedData.map((row, idx) => {
                          const hasErrors = !row.full_name || !row.national_id || !row.phone_number;
                          return (
                            <tr key={idx} className={hasErrors ? 'bg-rose-50 text-rose-700' : 'hover:bg-slate-50'}>
                              <td className="px-3 py-2 text-slate-400 font-semibold">{idx + 1}</td>
                              <td className="px-3 py-2 font-bold">{row.full_name || <span className="italic text-rose-500">Missing</span>}</td>
                              <td className="px-3 py-2">{row.national_id || <span className="italic text-rose-500">Missing</span>}</td>
                              <td className="px-3 py-2">{row.phone_number || <span className="italic text-rose-500">Missing</span>}</td>
                              <td className="px-3 py-2">${row.monthly_income || '0.00'}</td>
                              <td className="px-3 py-2">{row.region || 'Nairobi'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {bulkImportSummary ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2 text-emerald-800">
                      <p className="font-bold">🎉 Bulk Import Successful!</p>
                      <div className="grid grid-cols-3 gap-4 text-center font-bold">
                        <div className="bg-white p-2 rounded-xl border border-emerald-100">
                          <p className="text-[10px] text-slate-400">IMPORTED</p>
                          <p className="text-lg text-emerald-600">{bulkImportSummary.success}</p>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-emerald-100">
                          <p className="text-[10px] text-slate-400">DUPLICATES SKIPPED</p>
                          <p className="text-lg text-amber-500">{bulkImportSummary.duplicates}</p>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-emerald-100">
                          <p className="text-[10px] text-slate-400">ERRORS</p>
                          <p className="text-lg text-rose-500">{bulkImportSummary.errors}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center pt-2">
                      <p className="text-[10px] text-slate-400">
                        * Ready to import {bulkParsedData.filter(r => r.full_name && r.national_id && r.phone_number).length} profiles. Invalid rows will be skipped.
                      </p>
                      <button
                        type="button"
                        onClick={handleBulkImportSubmit}
                        disabled={bulkImportLoading}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {bulkImportLoading ? 'Processing...' : '🚀 Execute Bulk Import'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsBulkImportOpen(false);
                  setBulkParsedData([]);
                  setBulkCsvText('');
                  setBulkImportSummary(null);
                }}
                className="px-4 py-2 border border-slate-250 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Borrower Profile Detail & Editor Overlay */}
      {selectedBorrowerProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto text-slate-800 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg text-sm font-bold">👤</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                    {isProfileEditing ? (
                      <input
                        type="text"
                        value={editBorrowerData.full_name || ''}
                        onChange={(e) => setEditBorrowerData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="px-2 py-0.5 border border-slate-350 rounded font-semibold text-slate-800 text-xs w-48 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      selectedBorrowerProfile.full_name
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-450 font-bold uppercase">
                    {isProfileEditing ? 'Editing Borrower Profile Parameters' : 'Borrower Account Profile'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsProfileEditing(!isProfileEditing);
                    if (!isProfileEditing) {
                      setEditBorrowerData({ ...selectedBorrowerProfile });
                    }
                  }}
                  className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition cursor-pointer shadow-sm ${
                    isProfileEditing 
                      ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-650 hover:bg-indigo-100'
                  }`}
                >
                  {isProfileEditing ? '❌ Cancel Edit' : '✏️ Edit Profile'}
                </button>
                <button onClick={() => setSelectedBorrowerProfile(null)} className="text-slate-450 hover:text-slate-750 font-extrabold cursor-pointer">×</button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Profile details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section A: Bio & Demographics */}
                <div className="space-y-4 bg-slate-50/60 border border-slate-100 rounded-2xl p-4">
                  <h4 className="text-[10px] font-bold text-slate-550 uppercase tracking-widest border-b border-slate-200 pb-1">Personal & Contact Info</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-450 font-bold">National ID</p>
                      {isProfileEditing ? (
                        <input
                          type="text"
                          value={editBorrowerData.national_id || ''}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, national_id: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                        />
                      ) : (
                        <p className="text-slate-850 font-bold">{selectedBorrowerProfile.national_id}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-450 font-bold">Phone Number</p>
                      {isProfileEditing ? (
                        <input
                          type="text"
                          value={editBorrowerData.phone_number || ''}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, phone_number: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                        />
                      ) : (
                        <p className="text-slate-850 font-bold">{selectedBorrowerProfile.phone_number}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-450 font-bold">Residential Region</p>
                      {isProfileEditing ? (
                        <select
                          value={editBorrowerData.region || 'Nairobi'}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, region: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold outline-none"
                        >
                          {['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'].map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-slate-850 font-bold">{selectedBorrowerProfile.region || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-450 font-bold">Address</p>
                      {isProfileEditing ? (
                        <input
                          type="text"
                          value={editBorrowerData.address || ''}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                        />
                      ) : (
                        <p className="text-slate-850 font-bold">{selectedBorrowerProfile.address || '—'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-450 font-bold">Date of Birth</p>
                      {isProfileEditing ? (
                        <input
                          type="date"
                          value={editBorrowerData.date_of_birth || ''}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                        />
                      ) : (
                        <p className="text-slate-850 font-bold">{selectedBorrowerProfile.date_of_birth || '—'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-450 font-bold">Gender</p>
                      {isProfileEditing ? (
                        <select
                          value={editBorrowerData.gender || 'male'}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, gender: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold outline-none"
                        >
                          <option value="male">MALE</option>
                          <option value="female">FEMALE</option>
                        </select>
                      ) : (
                        <p className="text-slate-850 font-bold uppercase">{selectedBorrowerProfile.gender}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-450 font-bold">Email Address</p>
                      {isProfileEditing ? (
                        <input
                          type="email"
                          value={editBorrowerData.email || ''}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                        />
                      ) : (
                        <p className="text-slate-850 font-bold">{selectedBorrowerProfile.email || '—'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section B: Financial & Underwriting Metrics */}
                <div className="space-y-4 bg-slate-50/60 border border-slate-100 rounded-2xl p-4">
                  <h4 className="text-[10px] font-bold text-slate-550 uppercase tracking-widest border-b border-slate-200 pb-1">Underwriting & Financials</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-450 font-bold">Credit Score</p>
                      {isProfileEditing ? (
                        <input
                          type="number"
                          value={editBorrowerData.credit_score || ''}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, credit_score: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                        />
                      ) : (
                        <span className="font-extrabold text-indigo-650 text-sm">{selectedBorrowerProfile.credit_score || 'Pending'}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-450 font-bold">DTI Ratio (%)</p>
                      {isProfileEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          max="1.0"
                          value={editBorrowerData.debt_to_income_ratio === undefined ? 0.20 : editBorrowerData.debt_to_income_ratio}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, debt_to_income_ratio: parseFloat(e.target.value) }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                        />
                      ) : (
                        <p className="text-slate-850 font-bold">{Math.round((selectedBorrowerProfile.debt_to_income_ratio || 0.2) * 100)}%</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-450 font-bold">Monthly Income</p>
                      {isProfileEditing ? (
                        <input
                          type="number"
                          value={editBorrowerData.monthly_income || ''}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, monthly_income: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                        />
                      ) : (
                        <p className="text-slate-850 font-bold">${Number(selectedBorrowerProfile.monthly_income || 0).toLocaleString()}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-450 font-bold">Savings Balance</p>
                      {isProfileEditing ? (
                        <input
                          type="number"
                          value={editBorrowerData.savings_balance || ''}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, savings_balance: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                        />
                      ) : (
                        <p className="text-slate-850 font-bold">${Number(selectedBorrowerProfile.savings_balance || 0).toLocaleString()}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-450 font-bold">Occupation</p>
                      {isProfileEditing ? (
                        <input
                          type="text"
                          value={editBorrowerData.occupation || ''}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, occupation: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                        />
                      ) : (
                        <p className="text-slate-850 font-bold">{selectedBorrowerProfile.occupation || '—'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-450 font-bold">Employer</p>
                      {isProfileEditing ? (
                        <input
                          type="text"
                          value={editBorrowerData.employer || ''}
                          onChange={(e) => setEditBorrowerData(prev => ({ ...prev, employer: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                        />
                      ) : (
                        <p className="text-slate-850 font-bold">{selectedBorrowerProfile.employer || '—'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section C: Next of Kin & Collateral */}
                <div className="col-span-1 md:col-span-2 bg-slate-50/60 border border-slate-100 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-slate-450 font-bold">Next of Kin Name</p>
                    {isProfileEditing ? (
                      <input
                        type="text"
                        value={editBorrowerData.next_of_kin_name || ''}
                        onChange={(e) => setEditBorrowerData(prev => ({ ...prev, next_of_kin_name: e.target.value }))}
                        className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                      />
                    ) : (
                      <p className="text-slate-850 font-bold">{selectedBorrowerProfile.next_of_kin_name || '—'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-450 font-bold">Next of Kin Phone</p>
                    {isProfileEditing ? (
                      <input
                        type="text"
                        value={editBorrowerData.next_of_kin_phone || ''}
                        onChange={(e) => setEditBorrowerData(prev => ({ ...prev, next_of_kin_phone: e.target.value }))}
                        className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                      />
                    ) : (
                      <p className="text-slate-850 font-bold">{selectedBorrowerProfile.next_of_kin_phone || '—'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-450 font-bold">Collateral Details</p>
                    {isProfileEditing ? (
                      <input
                        type="text"
                        value={editBorrowerData.collateral_info || ''}
                        onChange={(e) => setEditBorrowerData(prev => ({ ...prev, collateral_info: e.target.value }))}
                        className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 bg-white text-slate-800 font-semibold"
                      />
                    ) : (
                      <p className="text-slate-850 font-bold">{selectedBorrowerProfile.collateral_info || 'No Collateral'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Borrowing & Loan Ledger */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                  <h4 className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Borrowing History Ledger</h4>
                  <span className="text-[9px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full font-bold uppercase">
                    {loans.filter(l => l.borrower_id === selectedBorrowerProfile.id).length} Loan(s)
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-450 font-bold uppercase text-[9px] tracking-wider">
                      <tr>
                        <th className="px-4 py-2">Loan Product</th>
                        <th className="px-4 py-2">Principal Amount</th>
                        <th className="px-4 py-2">Repaid</th>
                        <th className="px-4 py-2">Period</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loans.filter(l => l.borrower_id === selectedBorrowerProfile.id).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-6 text-center text-slate-450 font-medium italic">
                            No borrowing history on record for this borrower.
                          </td>
                        </tr>
                      ) : (
                        loans.filter(l => l.borrower_id === selectedBorrowerProfile.id).map(l => (
                          <tr key={l.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-bold text-slate-800">
                              <p>{l.loan_product}</p>
                              <p className="text-[9px] text-slate-450 font-semibold">{l.purpose || '—'}</p>
                            </td>
                            <td className="px-4 py-2.5 font-bold text-slate-700">${Number(l.amount).toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-slate-600">${Number(l.repaid_amount || 0).toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-slate-500 font-semibold">{l.repayment_period} mos</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                l.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-950/10' :
                                l.status === 'overdue' ? 'bg-rose-50 text-rose-600 border border-rose-950/10' :
                                l.status === 'fully_paid' ? 'bg-indigo-50 text-indigo-600 border border-indigo-950/10' :
                                'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {l.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              {isProfileEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileEditing(false);
                      setEditBorrowerData({ ...selectedBorrowerProfile });
                    }}
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBorrowerProfile}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-sm"
                  >
                    💾 Save Profile Changes
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedBorrowerProfile(null)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition shadow-sm"
                >
                  Close Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Internal Underwriting Audit Gate & Committee Panel */}
      {selectedAuditLoan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto text-slate-800 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 border border-amber-300 text-amber-600 rounded-lg text-sm font-bold">🔒</span>
                <div>
                  <h3 className="text-sm font-extrabold text-amber-900 uppercase tracking-widest">Internal Underwriting Audit Gate</h3>
                  <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">Credit Risk & Committee Decision Panel</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedAuditLoan(null);
                  setCommitteeDecisionNote('');
                }} 
                className="text-amber-700 hover:text-amber-955 font-extrabold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Context Summary */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Audited Portfolio Context</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-slate-450 font-bold">Applicant</p>
                    <p className="text-slate-850 font-extrabold">{selectedAuditLoan.borrower.full_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-450 font-bold">Requested Loan</p>
                    <p className="text-indigo-650 font-extrabold">${Number(selectedAuditLoan.loan.amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-450 font-bold">Product Type</p>
                    <p className="text-slate-850 font-bold">{selectedAuditLoan.loan.loan_product || 'General'}</p>
                  </div>
                  <div>
                    <p className="text-slate-450 font-bold">Risk Classification</p>
                    <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                      {selectedAuditLoan.borrower.customer_segment || 'Salaried'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Explanations of Triggers */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-550 uppercase tracking-widest flex items-center gap-1.5">
                  🛡️ Risk Audit Triggers Detected ({selectedAuditLoan.reasons.length})
                </h4>
                <div className="space-y-3">
                  {selectedAuditLoan.reasons.map((r, i) => (
                    <div key={i} className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-2xl flex gap-3 text-xs">
                      <span className="text-rose-600 text-base">⚠️</span>
                      <div className="space-y-1">
                        <p className="font-extrabold text-rose-900 uppercase tracking-wider text-[10px]">{r.title}</p>
                        <p className="text-slate-650 font-semibold">{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Committee Decision Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Committee Decision Override Note / Justification
                </label>
                <textarea
                  placeholder="Provide detailed, auditable justification for this committee intervention decision..."
                  value={committeeDecisionNote}
                  onChange={(e) => setCommitteeDecisionNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-800 font-semibold outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[80px]"
                />
              </div>

              {/* Accountability Signoff Disclaimer */}
              <div className="p-3 bg-amber-50/30 border border-amber-100 rounded-xl text-[9px] text-amber-800 font-bold uppercase tracking-wider">
                ✍️ This is a secure Administrative Decision. Executing any action signs off with your authenticated credentials ({currentUser?.email || 'admin@loanmanager.com'}) and registers an auditable log immediately.
              </div>
            </div>

            {/* Credit Committee Decision Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-3 justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedAuditLoan(null);
                  setCommitteeDecisionNote('');
                }}
                className="px-4 py-2 border border-slate-250 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer bg-white transition"
              >
                Close Audit Gate
              </button>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleAuditCommitteeDecision(selectedAuditLoan.loan.id, 'decline', committeeDecisionNote)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-sm transition"
                >
                  ❌ Decline Loan
                </button>
                <button
                  type="button"
                  onClick={() => handleAuditCommitteeDecision(selectedAuditLoan.loan.id, 'flag', committeeDecisionNote)}
                  className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-sm transition flex items-center gap-1"
                >
                  🚩 Flag Default & Collect
                </button>
                <button
                  type="button"
                  onClick={() => handleAuditCommitteeDecision(selectedAuditLoan.loan.id, 'approve', committeeDecisionNote)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-600/10 transition"
                >
                  🚀 Approve & Overwrite Risk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-6 text-center text-slate-500 text-xs font-bold relative z-10">
        © {new Date().getFullYear()} QuickCash Finance. All Rights Reserved. Universal Banking Data Gateway.
      </footer>
    </div>
  );
}