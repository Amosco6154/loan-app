import LoanModel from '../models/loanModel.js';
import db from '../config/db.js';
import { invalidateDashboardCache } from './dashboardController.js';

export const getLoans = (req, res) => {
  const { limit, page } = req.query;

  if (limit && page) {
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const offset = (parsedPage - 1) * parsedLimit;

    db.get('SELECT COUNT(*) as count FROM loans', [], (countErr, countRow) => {
      if (countErr) {
        return res.status(500).json({ message: 'Error retrieving count', error: countErr.message });
      }

      const total = countRow.count;
      const pages = Math.ceil(total / parsedLimit);

      db.all(`
        SELECT loans.*, borrowers.full_name as borrower_name, borrowers.national_id, borrowers.phone_number 
        FROM loans 
        JOIN borrowers ON loans.borrower_id = borrowers.id 
        ORDER BY loans.created_at DESC
        LIMIT ? OFFSET ?
      `, [parsedLimit, offset], (err, loans) => {
        if (err) {
          return res.status(500).json({ message: 'Error retrieving loans', error: err.message });
        }
        res.json({
          data: loans,
          pagination: {
            total,
            page: parsedPage,
            limit: parsedLimit,
            pages
          }
        });
      });
    });
  } else {
    LoanModel.getAllLoans((err, loans) => {
      if (err) {
        return res.status(500).json({ message: 'Error retrieving loans', error: err.message });
      }
      res.json(loans);
    });
  }
};

export const getLoan = (req, res) => {
  const { id } = req.params;
  LoanModel.getLoanById(id, (err, loan) => {
    if (err) {
      return res.status(500).json({ message: 'Error retrieving loan', error: err.message });
    }
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    res.json(loan);
  });
};

export const createLoan = (req, res) => {
  const { borrower_id, amount, interest_rate, due_date } = req.body;

  if (!borrower_id || !amount || !interest_rate || !due_date) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const loanData = { borrower_id, amount, interest_rate, due_date };

  LoanModel.createLoan(loanData, (err, lastID) => {
    if (err) {
      return res.status(500).json({ message: 'Error creating loan', error: err.message });
    }
    
    // Invalidate dashboard metrics cache on new loan creation
    invalidateDashboardCache();

    res.status(201).json({ message: 'Loan created successfully', id: lastID });
  });
};

export const updateLoan = (req, res) => {
  const { id } = req.params;
  const { amount, interest_rate, status, due_date } = req.body;

  if (!amount || !interest_rate || !status || !due_date) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const loanData = { amount, interest_rate, status, due_date };

  LoanModel.updateLoan(id, loanData, (err, changes) => {
    if (err) {
      return res.status(500).json({ message: 'Error updating loan', error: err.message });
    }
    if (changes === 0) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Invalidate dashboard metrics cache on loan edits
    invalidateDashboardCache();

    res.json({ message: 'Loan updated successfully' });
  });
};

export const deleteLoan = (req, res) => {
  const { id } = req.params;
  LoanModel.deleteLoan(id, (err, changes) => {
    if (err) {
      return res.status(500).json({ message: 'Error deleting loan', error: err.message });
    }
    if (changes === 0) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Invalidate dashboard metrics cache on loan deletion
    invalidateDashboardCache();

    res.json({ message: 'Loan deleted successfully' });
  });
};
