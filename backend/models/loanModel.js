import db from '../config/db.js';

class LoanModel {
  static getAllLoans(callback) {
    db.all(`
      SELECT loans.*, borrowers.full_name as borrower_name, borrowers.national_id, borrowers.phone_number 
      FROM loans 
      JOIN borrowers ON loans.borrower_id = borrowers.id 
      ORDER BY loans.created_at DESC
    `, [], callback);
  }

  static getLoanById(id, callback) {
    db.get(`
      SELECT loans.*, borrowers.full_name as borrower_name, borrowers.national_id, borrowers.phone_number 
      FROM loans 
      JOIN borrowers ON loans.borrower_id = borrowers.id 
      WHERE loans.id = ?
    `, [id], callback);
  }

  static createLoan(loanData, callback) {
    const { borrower_id, amount, interest_rate, due_date } = loanData;
    db.run(
      'INSERT INTO loans (borrower_id, amount, interest_rate, due_date) VALUES (?, ?, ?, ?)',
      [borrower_id, amount, interest_rate, due_date],
      function (err) {
        callback(err, this ? this.lastID : null);
      }
    );
  }

  static updateLoan(id, loanData, callback) {
    const { amount, interest_rate, status, due_date } = loanData;
    db.run(
      'UPDATE loans SET amount = ?, interest_rate = ?, status = ?, due_date = ? WHERE id = ?',
      [amount, interest_rate, status, due_date, id],
      function (err) {
        callback(err, this ? this.changes : 0);
      }
    );
  }

  static deleteLoan(id, callback) {
    db.run('DELETE FROM loans WHERE id = ?', [id], function (err) {
      callback(err, this ? this.changes : 0);
    });
  }
}

export default LoanModel;
