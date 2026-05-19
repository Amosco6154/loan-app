import db from '../config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { invalidateDashboardCache } from './dashboardController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getBorrowers = (req, res) => {
  const { limit, page } = req.query;

  if (limit && page) {
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const offset = (parsedPage - 1) * parsedLimit;

    // Get total count first for pagination metadata
    db.get('SELECT COUNT(*) as count FROM borrowers', [], (countErr, countRow) => {
      if (countErr) {
        return res.status(500).json({ message: 'Error retrieving count', error: countErr.message });
      }

      const total = countRow.count;
      const pages = Math.ceil(total / parsedLimit);

      db.all(
        'SELECT * FROM borrowers ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [parsedLimit, offset],
        (err, borrowers) => {
          if (err) {
            return res.status(500).json({ message: 'Error retrieving borrowers', error: err.message });
          }
          res.json({
            data: borrowers,
            pagination: {
              total,
              page: parsedPage,
              limit: parsedLimit,
              pages
            }
          });
        }
      );
    });
  } else {
    // Backward-compatible query return (full list)
    db.all('SELECT * FROM borrowers ORDER BY created_at DESC', [], (err, borrowers) => {
      if (err) {
        return res.status(500).json({ message: 'Error retrieving borrowers', error: err.message });
      }
      res.json(borrowers);
    });
  }
};

export const getBorrower = (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM borrowers WHERE id = ?', [id], (err, borrower) => {
    if (err) {
      return res.status(500).json({ message: 'Error retrieving borrower', error: err.message });
    }
    if (!borrower) return res.status(404).json({ message: 'Borrower not found' });
    res.json(borrower);
  });
};

export const createBorrower = (req, res) => {
  const {
    full_name, phone_number, national_id, address, region,
    date_of_birth, gender, email, occupation, employer,
    monthly_income, savings_balance, next_of_kin_name, next_of_kin_phone,
    collateral_info
  } = req.body;

  if (!full_name || !phone_number || !national_id) {
    return res.status(400).json({ message: 'Full name, phone number, and national ID are required' });
  }

  // Handle uploaded file path if present
  const id_document_path = req.file ? `/uploads/${req.file.filename}` : null;

  const normalize = (val) => val === undefined ? null : val;

  // Assign preliminary scoring parameters
  const income = monthly_income ? parseFloat(monthly_income) : 0.0;
  const savings = savings_balance ? parseFloat(savings_balance) : 0.0;
  
  let score = 300;
  if (income > 1000) score += 100;
  if (income > 5000) score += 150;
  if (savings > 5000) score += 100;
  if (collateral_info && collateral_info !== 'No Collateral') score += 100;
  if (employer) score += 100;
  score = Math.min(850, Math.max(300, score));
  const eligibility = score >= 550 ? 'eligible' : 'ineligible';
  const health = Math.round((score / 850) * 100);
  const segment = score >= 700 ? 'Loyal Customer' : score >= 550 ? 'Salaried Worker' : 'High-Risk User';

  db.run(
    `INSERT INTO borrowers 
      (full_name, phone_number, national_id, address, region, date_of_birth, gender, email, 
       occupation, employer, monthly_income, savings_balance, next_of_kin_name, next_of_kin_phone, 
       collateral_info, id_document_path, credit_score, financial_health_score, customer_segment, eligibility_status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      normalize(full_name), normalize(phone_number), normalize(national_id), normalize(address),
      normalize(region || 'Nairobi'), normalize(date_of_birth), normalize(gender), normalize(email),
      normalize(occupation), normalize(employer), income, savings, normalize(next_of_kin_name),
      normalize(next_of_kin_phone), normalize(collateral_info || 'No Collateral'), id_document_path,
      score, health, segment, eligibility
    ],
    function (err) {
      if (err) {
        console.error('Error creating borrower:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ message: 'National ID already exists' });
        }
        return res.status(500).json({ message: 'Error creating borrower', error: err.message });
      }
      
      // Invalidate the caching layer immediately!
      invalidateDashboardCache();

      res.status(201).json({ message: 'Borrower created successfully', id: this.lastID });
    }
  );
};

export const updateBorrower = (req, res) => {
  const { id } = req.params;
  const {
    full_name, phone_number, national_id, address, region, date_of_birth, gender, email,
    occupation, employer, monthly_income, savings_balance, next_of_kin_name, next_of_kin_phone,
    collateral_info, credit_score, debt_to_income_ratio, customer_segment, eligibility_status
  } = req.body;

  db.run(
    `UPDATE borrowers SET 
      full_name=?, phone_number=?, national_id=?, address=?, region=?, date_of_birth=?,
      gender=?, email=?, occupation=?, employer=?, monthly_income=?, savings_balance=?, 
      next_of_kin_name=?, next_of_kin_phone=?, collateral_info=?, credit_score=?, 
      debt_to_income_ratio=?, customer_segment=?, eligibility_status=? 
     WHERE id=?`,
    [
      full_name, phone_number, national_id, address, region, date_of_birth,
      gender, email, occupation, employer, monthly_income, savings_balance,
      next_of_kin_name, next_of_kin_phone, collateral_info, credit_score,
      debt_to_income_ratio, customer_segment, eligibility_status, id
    ],
    function (err) {
      if (err) return res.status(500).json({ message: 'Error updating borrower', error: err.message });
      if (this.changes === 0) return res.status(404).json({ message: 'Borrower not found' });
      
      invalidateDashboardCache();

      res.json({ message: 'Borrower updated successfully' });
    }
  );
};

export const assessEligibility = (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM borrowers WHERE id = ?', [id], (err, borrower) => {
    if (err || !borrower) return res.status(404).json({ message: 'Borrower not found' });

    let score = 300; // Base score
    if (borrower.monthly_income > 1000) score += 100;
    if (borrower.monthly_income > 5000) score += 150;
    if (borrower.savings_balance > 5000) score += 100;
    if (borrower.collateral_info && borrower.collateral_info !== 'No Collateral') score += 100;
    if (borrower.employer) score += 100;
    score = Math.min(850, Math.max(300, score));

    const status = score >= 550 ? 'eligible' : 'ineligible';
    const health = Math.round((score / 850) * 100);
    const segment = score >= 700 ? 'Loyal Customer' : score >= 550 ? 'Salaried Worker' : 'High-Risk User';

    db.run(
      'UPDATE borrowers SET credit_score = ?, eligibility_status = ?, financial_health_score = ?, customer_segment = ? WHERE id = ?',
      [score, status, health, segment, id],
      function (err) {
        if (err) return res.status(500).json({ message: 'Error updating eligibility' });
        
        invalidateDashboardCache();

        res.json({ message: 'Eligibility assessed', credit_score: score, eligibility_status: status });
      }
    );
  });
};

// Serving Protected Verification Documents securely
export const serveDocument = (req, res) => {
  const { filename } = req.params;
  const adminEmail = req.headers['x-admin-email'] || req.query.email;
  const token = req.query.token;

  // Basic security validation: requires either active admin header or standard query token
  if (adminEmail !== 'admin@loanmanager.com' && token !== 'admin_session') {
    return res.status(403).json({ message: 'Unauthorized access to protected document.' });
  }

  // Prevent Directory Traversal vulnerability
  const safeFilename = path.basename(filename);
  const filePath = path.join(__dirname, '../uploads/', safeFilename);

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('File send error:', err);
      res.status(404).json({ message: 'Document not found.' });
    }
  });
};

// Transactional Borrower Bulk Import Controller
export const bulkImportBorrowers = (req, res) => {
  const { borrowers } = req.body;

  if (!Array.isArray(borrowers) || borrowers.length === 0) {
    return res.status(400).json({ message: 'A valid array of borrowers is required' });
  }

  let successCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const errors = [];

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    const stmt = db.prepare(`
      INSERT INTO borrowers 
        (full_name, phone_number, national_id, address, region, date_of_birth, gender, email, 
         occupation, employer, monthly_income, savings_balance, next_of_kin_name, next_of_kin_phone, 
         collateral_info, document_verified, eligibility_status, credit_score, financial_health_score, customer_segment, debt_to_income_ratio) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Extract existing borrower IDs in memory for fast bulk deduplication
    db.all("SELECT national_id FROM borrowers", [], (err, rows) => {
      if (err) {
        db.run("ROLLBACK");
        return res.status(500).json({ message: 'Error checking existing borrowers', error: err.message });
      }

      const existingIds = new Set(rows.map(r => String(r.national_id).trim()));
      const seenInBatch = new Set();

      borrowers.forEach((b, index) => {
        const fullName = b.full_name ? String(b.full_name).trim() : null;
        const phoneNumber = b.phone_number ? String(b.phone_number).trim() : null;
        const nationalId = b.national_id ? String(b.national_id).trim() : null;

        if (!fullName || !phoneNumber || !nationalId) {
          errorCount++;
          errors.push(`Row ${index + 1}: Missing required fields (Name, Phone, or National ID)`);
          return;
        }

        if (existingIds.has(nationalId) || seenInBatch.has(nationalId)) {
          duplicateCount++;
          return;
        }

        seenInBatch.add(nationalId);

        // Normalize inputs
        const income = b.monthly_income ? parseFloat(b.monthly_income) : 0.0;
        const savings = b.savings_balance ? parseFloat(b.savings_balance) : 0.0;
        const dti = b.debt_to_income_ratio ? parseFloat(b.debt_to_income_ratio) : 0.0;

        // Auto credit score rules
        let score = 300;
        if (income > 1000) score += 100;
        if (income > 5000) score += 150;
        if (savings > 5000) score += 100;
        if (b.collateral_info && b.collateral_info !== 'No Collateral') score += 100;
        if (b.employer) score += 100;
        score = Math.min(850, Math.max(300, score));
        const eligibility = score >= 550 ? 'eligible' : 'ineligible';

        const region = b.region || 'Nairobi';
        const address = b.address || '';
        const dob = b.date_of_birth || null;
        const gender = b.gender || 'male';
        const email = b.email || null;
        const occupation = b.occupation || null;
        const employer = b.employer || null;
        const kinName = b.next_of_kin_name || null;
        const kinPhone = b.next_of_kin_phone || null;
        const collateral = b.collateral_info || 'No Collateral';
        const verified = 'verified';
        const health = Math.round((score / 850) * 100);
        const segment = score >= 700 ? 'Loyal Customer' : score >= 550 ? 'Salaried Worker' : 'High-Risk User';

        stmt.run(
          fullName, phoneNumber, nationalId, address, region, dob, gender, email,
          occupation, employer, income, savings, kinName, kinPhone,
          collateral, verified, eligibility, score, health, segment, dti
        );
        successCount++;
      });

      stmt.finalize();

      db.run("COMMIT", (commitErr) => {
        if (commitErr) {
          return res.status(500).json({ message: 'Transaction commit failed', error: commitErr.message });
        }

        // Add action to the database admin audit trails
        db.run(
          "INSERT INTO audit_logs (user_email, action, details, ip_address) VALUES (?, ?, ?, ?)",
          [
            req.body.adminEmail || 'admin@loanmanager.com',
            'BULK_IMPORT',
            `Imported ${successCount} new borrowers in bulk. Skipped ${duplicateCount} duplicates. Errors: ${errorCount}.`,
            req.ip || '127.0.0.1'
          ]
        );

        // Invalidate caching layer instantly to refresh totals
        invalidateDashboardCache();

        res.json({
          message: 'Bulk import complete',
          summary: {
            success: successCount,
            duplicates: duplicateCount,
            errors: errorCount
          },
          errorDetails: errors
        });
      });
    });
  });
};
