import db, { TABLE_QUERIES } from '../config/db.js';

// High-speed In-Memory Cache Optimization for Dashboard Stats
let statsCache = null;
let statsCacheExpiry = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

export const invalidateDashboardCache = () => {
  statsCache = null;
  statsCacheExpiry = 0;
  console.log('[CACHE] Dashboard stats cache successfully invalidated.');
};

// Helper to log administrative actions to the Audit Log database table
const logAdminAction = (email, action, details, ip = '127.0.0.1') => {
  db.run(
    'INSERT INTO audit_logs (user_email, action, details, ip_address) VALUES (?, ?, ?, ?)',
    [email || 'admin@loanmanager.com', action, details, ip]
  );
};

// 1. Get overall system stats (Borrower Analytics, Admin Intelligence, Revenue/Profit)
export const getDashboardStats = (req, res) => {
  const now = Date.now();
  if (statsCache && now < statsCacheExpiry) {
    console.log('[CACHE] Serving high-speed dashboard stats from in-memory cache.');
    return res.json(statsCache);
  }

  const queries = {
    totals: `
      SELECT 
        COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_loans,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_loans,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as completed_loans,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_loans
      FROM loans
    `,
    financials: `
      SELECT 
        SUM(amount) as total_disbursed,
        SUM(repaid_amount) as total_repaid,
        SUM(amount - repaid_amount) as outstanding_balance
      FROM loans
      WHERE status != 'pending'
    `,
    borrowers: `
      SELECT 
        COUNT(*) as total_borrowers,
        SUM(CASE WHEN eligibility_status = 'eligible' THEN 1 ELSE 0 END) as eligible_borrowers,
        SUM(CASE WHEN eligibility_status = 'ineligible' THEN 1 ELSE 0 END) as ineligible_borrowers,
        SUM(CASE WHEN eligibility_status = 'pending' THEN 1 ELSE 0 END) as pending_assessments,
        AVG(credit_score) as avg_credit_score,
        AVG(financial_health_score) as avg_financial_health
      FROM borrowers
    `,
    flags: `
      SELECT COUNT(*) as active_fraud_flags FROM fraud_alerts WHERE status = 'flagged'
    `,
    collections: `
      SELECT COUNT(*) as pending_collection_tasks FROM collection_tasks WHERE recovery_status != 'recovered'
    `
  };

  db.get(queries.totals, [], (err, totals) => {
    if (err) return res.status(500).json({ message: 'Error fetching totals', error: err.message });

    db.get(queries.financials, [], (err, financials) => {
      if (err) return res.status(500).json({ message: 'Error fetching financials', error: err.message });

      db.get(queries.borrowers, [], (err, borrowers) => {
        if (err) return res.status(500).json({ message: 'Error fetching borrowers', error: err.message });

        db.get(queries.flags, [], (err, flags) => {
          if (err) return res.status(500).json({ message: 'Error fetching flags', error: err.message });

          db.get(queries.collections, [], (err, collections) => {
            if (err) return res.status(500).json({ message: 'Error fetching collections', error: err.message });

            const disbursedVal = financials.total_disbursed || 0;
            const repaidVal = financials.total_repaid || 0;
            const interestIncome = disbursedVal * 0.085;
            const recoverySuccess = disbursedVal > 0 ? (repaidVal / disbursedVal) * 100 : 100;

            const responseData = {
              totals: {
                applications: totals.total_applications || 0,
                pending: totals.pending_loans || 0,
                active: totals.active_loans || 0,
                completed: totals.completed_loans || 0,
                overdue: totals.overdue_loans || 0
              },
              financials: {
                disbursed: disbursedVal,
                repaid: repaidVal,
                outstanding: financials.outstanding_balance || 0,
                interestIncome,
                recoveryRate: parseFloat(recoverySuccess.toFixed(1))
              },
              borrowers: {
                count: borrowers.total_borrowers || 0,
                eligible: borrowers.eligible_borrowers || 0,
                ineligible: borrowers.ineligible_borrowers || 0,
                pendingAssessments: borrowers.pending_assessments || 0,
                avgCreditScore: Math.round(borrowers.avg_credit_score || 0),
                avgFinancialHealth: Math.round(borrowers.avg_financial_health || 0)
              },
              flags: flags.active_fraud_flags || 0,
              collections: collections.pending_collection_tasks || 0
            };

            // Cache fresh metrics
            statsCache = responseData;
            statsCacheExpiry = now + CACHE_TTL;
            console.log('[CACHE] Generated fresh stats and populated in-memory cache.');

            res.json(responseData);
          });
        });
      });
    });
  });
};

// 2. Geographic Borrowing Analysis
export const getGeographicAnalysis = (req, res) => {
  const query = `
    SELECT 
      b.region,
      COUNT(l.id) as loan_count,
      SUM(l.amount) as total_borrowed,
      SUM(l.repaid_amount) as total_repaid,
      SUM(CASE WHEN l.status = 'overdue' THEN l.amount - l.repaid_amount ELSE 0 END) as default_amount,
      SUM(CASE WHEN l.status = 'overdue' THEN 1 ELSE 0 END) as default_count
    FROM borrowers b
    LEFT JOIN loans l ON b.id = l.borrower_id
    WHERE b.region IS NOT NULL
    GROUP BY b.region
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error retrieving geographic analysis', error: err.message });
    
    const regions = ['Nairobi', 'Kisumu', 'Mombasa', 'Nakuru'];
    const result = regions.map(r => {
      const row = rows.find(x => x.region === r) || {};
      const count = row.loan_count || 0;
      const borrowed = row.total_borrowed || 0;
      const repaid = row.total_repaid || 0;
      const defaults = row.default_amount || 0;
      const repaymentRate = borrowed > 0 ? (repaid / borrowed) * 100 : 100;

      return {
        region: r,
        loansCount: count,
        totalBorrowed: borrowed,
        totalRepaid: repaid,
        defaultAmount: defaults,
        repaymentSuccessRate: parseFloat(repaymentRate.toFixed(1)),
        riskLevel: defaults > 2000 ? 'high' : defaults > 0 ? 'medium' : 'low'
      };
    });

    res.json(result);
  });
};

// 3. Fraud Detection Scanning
export const getFraudStatus = (req, res) => {
  const queryAlerts = `
    SELECT f.*, b.full_name, b.national_id, b.phone_number, b.email, b.id_document_path
    FROM fraud_alerts f
    JOIN borrowers b ON f.borrower_id = b.id
    ORDER BY f.created_at DESC
  `;

  const queryDuplicateIps = `
    SELECT ip_address, COUNT(*) as occurrence, GROUP_CONCAT(b.full_name, ', ') as matching_borrowers
    FROM loans l
    JOIN borrowers b ON l.borrower_id = b.id
    WHERE ip_address IS NOT NULL AND ip_address != ''
    GROUP BY ip_address
    HAVING COUNT(*) > 1
  `;

  db.all(queryAlerts, [], (err, alerts) => {
    if (err) return res.status(500).json({ message: 'Error retrieving alerts', error: err.message });

    db.all(queryDuplicateIps, [], (err, duplicateIps) => {
      if (err) return res.status(500).json({ message: 'Error checking duplicate IPs', error: err.message });

      res.json({
        alerts,
        ipCollisions: duplicateIps.map(x => ({
          ip: x.ip_address,
          count: x.occurrence,
          borrowers: x.matching_borrowers,
          description: `Device collision: ${x.occurrence} applications registered from same workstation IP.`
        }))
      });
    });
  });
};

// 4. Repayments & Overdue Collections
export const getRepaymentsAndCollections = (req, res) => {
  const queryInstallments = `
    SELECT r.*, l.loan_product, l.amount as loan_total, b.full_name as borrower_name
    FROM repayments r
    JOIN loans l ON r.loan_id = l.id
    JOIN borrowers b ON l.borrower_id = b.id
    ORDER BY r.due_date ASC
  `;

  const queryCollectionTasks = `
    SELECT c.*, l.amount as loan_amount, l.repaid_amount, l.loan_product, b.full_name as borrower_name, b.phone_number
    FROM collection_tasks c
    JOIN loans l ON c.loan_id = l.id
    JOIN borrowers b ON l.borrower_id = b.id
    ORDER BY c.last_contact_date DESC
  `;

  db.all(queryInstallments, [], (err, installments) => {
    if (err) return res.status(500).json({ message: 'Error retrieving repayments', error: err.message });

    db.all(queryCollectionTasks, [], (err, tasks) => {
      if (err) return res.status(500).json({ message: 'Error retrieving collections', error: err.message });

      const queryPredictions = `
        SELECT id, full_name, credit_score, debt_to_income_ratio, savings_balance, monthly_income
        FROM borrowers
        WHERE eligibility_status = 'eligible' AND (credit_score < 600 OR debt_to_income_ratio > 0.35)
      `;

      db.all(queryPredictions, [], (err, predictions) => {
        if (err) return res.status(500).json({ message: 'Error retrieving predictive defaults', error: err.message });

        const formattedPredictions = predictions.map(p => {
          let riskProbability = 'low';
          let percentage = 15;
          if (p.credit_score < 500 || p.debt_to_income_ratio > 0.6) {
            riskProbability = 'high';
            percentage = 85;
          } else if (p.credit_score < 650 || p.debt_to_income_ratio > 0.35) {
            riskProbability = 'medium';
            percentage = 48;
          }

          return {
            borrowerId: p.id,
            name: p.full_name,
            creditScore: p.credit_score,
            dtiRatio: p.debt_to_income_ratio,
            savings: p.savings_balance,
            income: p.monthly_income,
            defaultProbability: riskProbability,
            riskScore: percentage,
            triggerReason: p.debt_to_income_ratio > 0.5 ? 'Excessive Debt-to-Income ratio' : 'Low credit score paired with weak savings'
          };
        });

        res.json({
          installments,
          collectionTasks: tasks,
          defaultPredictions: formattedPredictions
        });
      });
    });
  });
};

// 5. Loan Recommendation Engine
export const getLoanRecommendations = (req, res) => {
  const { borrowerId } = req.query;

  if (!borrowerId) {
    return res.status(400).json({ message: 'Borrower ID is required' });
  }

  db.get('SELECT * FROM borrowers WHERE id = ?', [borrowerId], (err, b) => {
    if (err || !b) return res.status(404).json({ message: 'Borrower not found' });

    let recommendations = [];

    if (b.eligibility_status === 'ineligible') {
      recommendations.push({
        product: 'Credit Building Micro-Savings',
        amountRange: '$100 - $500',
        period: '3 months',
        interestRate: 15.0,
        explanation: 'Due to current ineligible credit assessment, we recommend entering our savings-first program to rebuild repayment discipline.'
      });
    } else {
      const income = b.monthly_income || 0;
      const credit = b.credit_score || 500;

      if (credit >= 750) {
        recommendations.push({
          product: 'Elite Business Expansion Loan',
          amountRange: `$${Math.round(income * 1.5).toLocaleString()} - $${Math.round(income * 2.5).toLocaleString()}`,
          period: '12 - 36 months',
          interestRate: 6.5,
          explanation: 'Top-tier recommendation based on exceptional credit rating and high monthly income.'
        });
        recommendations.push({
          product: 'Premium Low-Interest Personal Advance',
          amountRange: `$1,000 - $${Math.round(income * 1.0).toLocaleString()}`,
          period: '6 - 12 months',
          interestRate: 8.0,
          explanation: 'Highly liquid unsecured line available for instant disbursement.'
        });
      } else if (credit >= 600) {
        recommendations.push({
          product: 'Standard Salaried/Commercial Loan',
          amountRange: `$${Math.round(income * 0.8).toLocaleString()} - $${Math.round(income * 1.2).toLocaleString()}`,
          period: '6 - 18 months',
          interestRate: 9.5,
          explanation: 'Standard interest offering tailored for consistent salaried employment.'
        });
      } else {
        recommendations.push({
          product: 'Emergency Cash / Short-Term Loan',
          amountRange: '$500 - $1,500',
          period: '1 - 3 months',
          interestRate: 12.5,
          explanation: 'Unsecured micro-product optimized for low credit risk exposure.'
        });
      }
    }

    res.json({
      borrower: {
        name: b.full_name,
        income: b.monthly_income,
        score: b.credit_score,
        status: b.eligibility_status
      },
      recommendations
    });
  });
};

// 6. AI Insights & Predictions
export const getAiInsights = (req, res) => {
  const demandForecast = [
    { month: 'Jan', currentYear: 18, projectedNext: 22 },
    { month: 'Feb', currentYear: 22, projectedNext: 25 },
    { month: 'Mar', currentYear: 28, projectedNext: 34 },
    { month: 'Apr', currentYear: 35, projectedNext: 42 },
    { month: 'May', currentYear: 42, projectedNext: 50 },
    { month: 'Jun', currentYear: 49, projectedNext: 58 }
  ];

  const querySegments = `
    SELECT customer_segment as segment, COUNT(*) as count, AVG(monthly_income) as avg_income, AVG(credit_score) as avg_credit
    FROM borrowers
    WHERE customer_segment IS NOT NULL
    GROUP BY customer_segment
  `;

  const queryProducts = `
    SELECT 
      loan_product as product,
      COUNT(id) as total_issued,
      SUM(amount) as total_disbursed,
      SUM(repaid_amount) as total_repaid,
      SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as default_count
    FROM loans
    WHERE loan_product IS NOT NULL
    GROUP BY loan_product
  `;

  db.all(querySegments, [], (err, segments) => {
    if (err) return res.status(500).json({ message: 'Error retrieving segments', error: err.message });

    db.all(queryProducts, [], (err, products) => {
      if (err) return res.status(500).json({ message: 'Error retrieving products', error: err.message });

      const performance = products.map(p => {
        const dis = p.total_disbursed || 0;
        const rep = p.total_repaid || 0;
        const successRate = dis > 0 ? (rep / dis) * 100 : 100;
        const interestRevenue = dis * 0.085;

        return {
          product: p.product,
          issuedCount: p.total_issued,
          disbursed: dis,
          repaid: rep,
          defaultCount: p.default_count,
          repaymentRate: parseFloat(successRate.toFixed(1)),
          estimatedInterest: parseFloat(interestRevenue.toFixed(2))
        };
      });

      res.json({
        demandForecast,
        segmentation: segments,
        productPerformance: performance
      });
    });
  });
};

// 7. Get API Integrations logs
export const getApiLogs = (req, res) => {
  const timestamp = new Date().toISOString();
  const mockLogs = [
    { time: timestamp, type: 'CRB', status: 'SUCCESS', message: 'Inquired Credit Bureau rating for National ID 31245678. Score returned: 780 (Low Risk).' },
    { time: timestamp, type: 'SMS', status: 'SENT', message: 'Automated installment reminder successfully queued for Alice Kamau (+254 712 345 678).' },
    { time: timestamp, type: 'BANK', status: 'SUCCESS', message: 'Bank account verification request complete for Safaricom account 0110324888. Verified.' },
    { time: timestamp, type: 'M-PESA', status: 'COMPLETED', message: 'Disbursement of $15,000 completed via B2C API to Alice Kamau. Transaction ID: TMX9283K12.' },
    { time: timestamp, type: 'SMS', status: 'SENT', message: 'Overdue alert notification dispatched via SMS Gateway to Francis Mutua (+254 711 000 111).' }
  ];

  res.json(mockLogs);
};

// 8. Fetch audit logs (Accountability logs)
export const getAuditLogs = (req, res) => {
  db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error retrieving audit logs', error: err.message });
    res.json(rows);
  });
};

// 9. Verify uploaded documents
export const verifyDocument = (req, res) => {
  const { id } = req.params;
  const { status, notes, adminEmail } = req.body; // status: 'verified' or 'rejected'

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  db.get('SELECT full_name FROM borrowers WHERE id = ?', [id], (err, b) => {
    const borrowerName = b ? b.full_name : `ID ${id}`;
    
    db.run(
      'UPDATE borrowers SET document_verified = ?, document_notes = ? WHERE id = ?',
      [status, notes || '', id],
      function (err) {
        if (err) return res.status(500).json({ message: 'Error verifying document', error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Borrower not found' });
        
        logAdminAction(
          adminEmail, 
          'DOCUMENT_AUDIT', 
          `Manually marked documents for ${borrowerName} as ${status.toUpperCase()}. Notes: ${notes || 'None'}`
        );

        res.json({ message: `Document successfully marked as ${status}.` });
      }
    );
  });
};

// 10. Update Loan Stage & Process Lifecycle
export const updateLoanStage = (req, res) => {
  const { id } = req.params;
  const { stage, adminEmail } = req.body;

  if (!stage) return res.status(400).json({ message: 'Stage is required' });

  db.get('SELECT l.*, b.full_name as borrower_name FROM loans l JOIN borrowers b ON l.borrower_id = b.id WHERE l.id = ?', [id], (err, loan) => {
    if (err || !loan) return res.status(404).json({ message: 'Loan not found' });

    let status = loan.status;
    let approved_at = loan.approved_at;
    let disbursed_at = loan.disbursed_at;

    if (stage === 'approved') {
      status = 'active';
      approved_at = new Date().toISOString();
    } else if (stage === 'disbursed') {
      disbursed_at = new Date().toISOString();
      const installmentsCount = loan.repayment_period || 12;
      const installmentAmount = (loan.amount * (1 + loan.interest_rate / 100)) / installmentsCount;
      
      const stmt = db.prepare(`
        INSERT INTO repayments (loan_id, amount_due, amount_paid, due_date, status)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (let i = 1; i <= installmentsCount; i++) {
        const due = new Date();
        due.setMonth(due.getMonth() + i);
        const dueStr = due.toISOString().split('T')[0];
        stmt.run(id, parseFloat(installmentAmount.toFixed(2)), 0.0, dueStr, 'pending');
      }
      stmt.finalize();
    } else if (stage === 'completed') {
      status = 'paid';
    } else if (stage === 'defaulted') {
      status = 'overdue';
      
      db.run(
        `INSERT OR IGNORE INTO collection_tasks (loan_id, assignee, recovery_status, notes)
         VALUES (?, 'Admin Officer', 'pending', 'Automated trigger: Loan flagged overdue during lifecycle stage migration.')`,
        [id]
      );
    } else if (stage === 'declined') {
      status = 'pending';
      approved_at = null;
      disbursed_at = null;
    }

    db.run(
      'UPDATE loans SET stage = ?, status = ?, approved_at = ?, disbursed_at = ? WHERE id = ?',
      [stage, status, approved_at, disbursed_at, id],
      function (err) {
        if (err) return res.status(500).json({ message: 'Error updating lifecycle', error: err.message });
        
        logAdminAction(
          adminEmail,
          'LIFECYCLE_MIGRATION',
          `Advanced Loan ID ${id} (issued to ${loan.borrower_name}) to stage ${stage.toUpperCase()}. Current status: ${status.toUpperCase()}.`
        );

        res.json({ message: `Loan successfully moved to stage ${stage}.`, status, stage });
      }
    );
  });
};

// 11. Simulate Loan Repayment
export const simulateRepayment = (req, res) => {
  const { id } = req.params;
  const { amount, adminEmail } = req.body;

  if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid payment amount is required' });

  db.get('SELECT l.*, b.full_name as borrower_name FROM loans l JOIN borrowers b ON l.borrower_id = b.id WHERE l.id = ?', [id], (err, loan) => {
    if (err || !loan) return res.status(404).json({ message: 'Loan not found' });

    const newRepaid = (loan.repaid_amount || 0) + parseFloat(amount);
    let newStatus = loan.status;
    let newStage = loan.stage;

    if (newRepaid >= loan.amount) {
      newStatus = 'paid';
      newStage = 'completed';
    }

    db.serialize(() => {
      db.run(
        'UPDATE loans SET repaid_amount = ?, status = ?, stage = ?, last_payment_date = ? WHERE id = ?',
        [newRepaid, newStatus, newStage, new Date().toISOString().split('T')[0], id]
      );

      db.all(
        'SELECT * FROM repayments WHERE loan_id = ? AND status != "paid" ORDER BY due_date ASC',
        [id],
        (err, repayments) => {
          if (err || !repayments) return;

          let remainingPayment = parseFloat(amount);
          
          repayments.forEach(r => {
            if (remainingPayment <= 0) return;

            const remainingDue = r.amount_due - (r.amount_paid || 0);
            if (remainingPayment >= remainingDue) {
              remainingPayment -= remainingDue;
              db.run(
                'UPDATE repayments SET status = "paid", amount_paid = ?, paid_at = ? WHERE id = ?',
                [r.amount_due, new Date().toISOString().split('T')[0], r.id]
              );
            } else {
              const paidSum = (r.amount_paid || 0) + remainingPayment;
              remainingPayment = 0;
              db.run(
                'UPDATE repayments SET amount_paid = ?, paid_at = ? WHERE id = ?',
                [paidSum, new Date().toISOString().split('T')[0], r.id]
              );
            }
          });
        }
      );

      if (newStatus === 'paid') {
        db.run(
          'UPDATE collection_tasks SET recovery_status = "recovered", notes = "Recovered in full via automated payment simulator." WHERE loan_id = ?',
          [id]
        );
      }

      logAdminAction(
        adminEmail,
        'REPAYMENT_SIMULATION',
        `Processed simulated payment of $${amount} for Loan ID ${id} (Borrower: ${loan.borrower_name}). Remaining balance: $${Math.max(0, loan.amount - newRepaid)}`
      );

      res.json({ message: 'Repayment successfully simulated.', repaid_amount: newRepaid, status: newStatus, stage: newStage });
    });
  });
};

// 12. Add Collection Tasks Notes
export const addCollectionNote = (req, res) => {
  const { id } = req.params;
  const { notes, recovery_status, adminEmail } = req.body;

  if (!notes) return res.status(400).json({ message: 'Notes are required' });

  db.get('SELECT c.*, b.full_name as borrower_name FROM collection_tasks c JOIN loans l ON c.loan_id = l.id JOIN borrowers b ON l.borrower_id = b.id WHERE c.id = ?', [id], (err, task) => {
    db.run(
      'UPDATE collection_tasks SET notes = ?, recovery_status = ?, last_contact_date = ? WHERE id = ?',
      [notes, recovery_status || 'contacted', new Date().toISOString().split('T')[0], id],
      function (err) {
        if (err) return res.status(500).json({ message: 'Error adding collection note', error: err.message });
        
        logAdminAction(
          adminEmail,
          'COLLECTION_FOLLOWUP',
          `Added recovery note for borrower ${task ? task.borrower_name : `Task ${id}`}. Status updated to: ${recovery_status.toUpperCase()}.`
        );

        invalidateDashboardCache();
        res.json({ message: 'Collection tracking successfully updated.' });
      }
    );
  });
};

// 13. Fresh Install (Reset entire system data except users/admins)
export const resetDatabase = (req, res) => {
  const { adminEmail } = req.body;

  db.serialize(() => {
    // Drop all operational tables
    db.run('DROP TABLE IF EXISTS audit_logs');
    db.run('DROP TABLE IF EXISTS fraud_alerts');
    db.run('DROP TABLE IF EXISTS collection_tasks');
    db.run('DROP TABLE IF EXISTS repayments');
    db.run('DROP TABLE IF EXISTS loans');
    db.run('DROP TABLE IF EXISTS borrowers');

    // Recreate operational tables using exported queries
    db.run(TABLE_QUERIES.borrowers);
    db.run(TABLE_QUERIES.loans);
    db.run(TABLE_QUERIES.repayments);
    db.run(TABLE_QUERIES.collection_tasks);
    db.run(TABLE_QUERIES.fraud_alerts);
    db.run(TABLE_QUERIES.audit_logs, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error re-creating tables during fresh install', error: err.message });
      }

      // Log the fresh install action inside the new audit_logs table!
      logAdminAction(
        adminEmail || 'admin@loanmanager.com', 
        'SYSTEM_RESET', 
        'Triggered Nuclear Reset / Fresh Install. Cleared all borrower ledger data, loans, schedules, and active tasks. Preserved system administrative user accounts.',
        req.ip || '127.0.0.1'
      );

      invalidateDashboardCache();
      res.json({ message: 'Nuclear fresh install successfully executed. Operational databases wiped clean.' });
    });
  });
};
