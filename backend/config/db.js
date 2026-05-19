import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// PBKDF2 cryptography helpers
export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
};

export const verifyPassword = (password, storedPassword) => {
  if (!storedPassword || !storedPassword.includes(':')) return false;
  const [salt, originalHash] = storedPassword.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
  return hash === originalHash;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../loans.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    createTables();
  }
});

// Export table queries so they can be reused for the Fresh Install reset logic
export const TABLE_QUERIES = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'client')) DEFAULT 'client',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  borrowers: `
    CREATE TABLE IF NOT EXISTS borrowers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      national_id TEXT NOT NULL UNIQUE,
      address TEXT,
      region TEXT,
      date_of_birth TEXT,
      gender TEXT,
      email TEXT,
      occupation TEXT,
      employer TEXT,
      monthly_income REAL DEFAULT 0.0,
      savings_balance REAL DEFAULT 0.0,
      next_of_kin_name TEXT,
      next_of_kin_phone TEXT,
      collateral_info TEXT,
      id_document_path TEXT,
      document_verified TEXT DEFAULT 'pending',
      document_notes TEXT,
      eligibility_status TEXT CHECK(eligibility_status IN ('pending', 'eligible', 'ineligible')) DEFAULT 'pending',
      credit_score INTEGER,
      financial_health_score INTEGER,
      customer_segment TEXT,
      debt_to_income_ratio REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  loans: `
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      borrower_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      repayment_period INTEGER DEFAULT 12,
      loan_product TEXT,
      purpose TEXT,
      status TEXT CHECK(status IN ('active', 'paid', 'overdue', 'pending')) DEFAULT 'pending',
      stage TEXT DEFAULT 'application',
      repaid_amount REAL DEFAULT 0.0,
      due_date TEXT NOT NULL,
      approved_at TEXT,
      disbursed_at TEXT,
      last_payment_date TEXT,
      ip_address TEXT,
      device_fingerprint TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE
    )
  `,
  repayments: `
    CREATE TABLE IF NOT EXISTS repayments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      amount_due REAL NOT NULL,
      amount_paid REAL DEFAULT 0.0,
      due_date TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
      paid_at TEXT,
      FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
    )
  `,
  collection_tasks: `
    CREATE TABLE IF NOT EXISTS collection_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      assignee TEXT DEFAULT 'Admin',
      recovery_status TEXT CHECK(recovery_status IN ('pending', 'contacted', 'promised_payment', 'recovered', 'uncollectible')) DEFAULT 'pending',
      last_contact_date TEXT,
      notes TEXT,
      FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
    )
  `,
  fraud_alerts: `
    CREATE TABLE IF NOT EXISTS fraud_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      borrower_id INTEGER NOT NULL,
      risk_level TEXT CHECK(risk_level IN ('low', 'medium', 'high')) DEFAULT 'low',
      reason TEXT,
      status TEXT DEFAULT 'flagged',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE
    )
  `,
  audit_logs: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  api_integrations: `
    CREATE TABLE IF NOT EXISTS api_integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      key_value TEXT NOT NULL,
      status TEXT CHECK(status IN ('online', 'offline')) DEFAULT 'online',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
};

const createTables = () => {
  db.serialize(() => {
    // Drop existing tables to ensure a clean slate with advanced schema & rich mock data
    console.log('Resetting and seeding database tables...');
    db.run('DROP TABLE IF EXISTS api_integrations');
    db.run('DROP TABLE IF EXISTS audit_logs');
    db.run('DROP TABLE IF EXISTS fraud_alerts');
    db.run('DROP TABLE IF EXISTS collection_tasks');
    db.run('DROP TABLE IF EXISTS repayments');
    db.run('DROP TABLE IF EXISTS loans');
    db.run('DROP TABLE IF EXISTS borrowers');
    db.run('DROP TABLE IF EXISTS users');

    db.run(TABLE_QUERIES.users);
    db.run(TABLE_QUERIES.borrowers);
    db.run(TABLE_QUERIES.loans);
    db.run(TABLE_QUERIES.repayments);
    db.run(TABLE_QUERIES.collection_tasks);
    db.run(TABLE_QUERIES.fraud_alerts);
    db.run(TABLE_QUERIES.api_integrations);
    db.run(TABLE_QUERIES.audit_logs, (err) => {
      if (err) {
        console.error('Error creating database tables:', err.message);
      } else {
        console.log('Database tables successfully created.');
        seedData();
      }
    });
  });
};

const seedData = () => {
  db.serialize(() => {
    // 1. Seed Users (Hashed Passwords)
    const adminHash = hashPassword('admin123');
    const clientHash = hashPassword('client123');
    db.run("INSERT INTO users (email, password, role) VALUES ('admin@loanmanager.com', ?, 'admin')", [adminHash]);
    db.run("INSERT INTO users (email, password, role) VALUES ('client@loanmanager.com', ?, 'client')", [clientHash]);

    // Helper functions for dates
    const getFutureDate = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };
    const getPastDate = (days) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    // 2. Seed Borrowers
    const borrowersData = [
      {
        full_name: 'Alice Kamau',
        phone_number: '+254 712 345 678',
        national_id: '31245678',
        address: 'Kilimani, Nairobi',
        region: 'Nairobi',
        date_of_birth: '1990-05-15',
        gender: 'female',
        email: 'alice.kamau@email.com',
        occupation: 'Senior Accountant',
        employer: 'PriceWaterhouseCoopers',
        monthly_income: 6800.0,
        savings_balance: 14500.0,
        next_of_kin_name: 'David Kamau',
        next_of_kin_phone: '+254 722 999 888',
        collateral_info: 'Toyota Vanguard Logbook KDD 123A',
        id_document_path: '/uploads/id-sample-1.pdf',
        document_verified: 'verified',
        document_notes: 'Verified against national registrar database.',
        eligibility_status: 'eligible',
        credit_score: 780,
        financial_health_score: 85,
        customer_segment: 'Loyal Customer',
        debt_to_income_ratio: 0.15
      },
      {
        full_name: 'Bernard Ochieng',
        phone_number: '+254 733 456 789',
        national_id: '28456123',
        address: 'Milimani, Kisumu',
        region: 'Kisumu',
        date_of_birth: '1987-11-22',
        gender: 'male',
        email: 'bernard.ochieng@email.com',
        occupation: 'High School Teacher',
        employer: 'Teachers Service Commission',
        monthly_income: 2400.0,
        savings_balance: 1200.0,
        next_of_kin_name: 'Mary Ochieng',
        next_of_kin_phone: '+254 733 111 222',
        collateral_info: 'No Collateral',
        id_document_path: '/uploads/id-sample-2.jpg',
        document_verified: 'verified',
        document_notes: 'Payslip matches banking statement records.',
        eligibility_status: 'eligible',
        credit_score: 640,
        financial_health_score: 58,
        customer_segment: 'Salaried Worker',
        debt_to_income_ratio: 0.32
      },
      {
        full_name: 'Clara Mwangi',
        phone_number: '+254 701 123 456',
        national_id: '35678912',
        address: 'Nyali, Mombasa',
        region: 'Mombasa',
        date_of_birth: '1995-02-10',
        gender: 'female',
        email: 'clara.m@email.com',
        occupation: 'Freelance Designer',
        employer: 'Upwork Self Employed',
        monthly_income: 1100.0,
        savings_balance: 150.0,
        next_of_kin_name: 'John Mwangi',
        next_of_kin_phone: '+254 701 999 999',
        collateral_info: 'No Collateral',
        id_document_path: '/uploads/id-sample-3.jpg',
        document_verified: 'rejected',
        document_notes: 'Uploaded ID image is illegible and suspected spoofing.',
        eligibility_status: 'ineligible',
        credit_score: 410,
        financial_health_score: 28,
        customer_segment: 'High-Risk User',
        debt_to_income_ratio: 0.65
      },
      {
        full_name: 'David Kiprop',
        phone_number: '+254 722 888 777',
        national_id: '29876543',
        address: 'Njoro, Nakuru',
        region: 'Nakuru',
        date_of_birth: '1984-08-30',
        gender: 'male',
        email: 'david.kiprop@email.com',
        occupation: 'Retail Business Owner',
        employer: 'Kiprop Wholesalers',
        monthly_income: 5200.0,
        savings_balance: 8500.0,
        next_of_kin_name: 'Sarah Kiprop',
        next_of_kin_phone: '+254 722 444 555',
        collateral_info: 'Business Stock and Commercial Plot Title Deed',
        id_document_path: '/uploads/id-sample-4.png',
        document_verified: 'verified',
        document_notes: 'Audited statements verify high cash flows.',
        eligibility_status: 'eligible',
        credit_score: 720,
        financial_health_score: 78,
        customer_segment: 'Business Owner',
        debt_to_income_ratio: 0.22
      },
      {
        full_name: 'Emily Chen',
        phone_number: '+254 799 111 222',
        national_id: '38123456',
        address: 'Westlands, Nairobi',
        region: 'Nairobi',
        date_of_birth: '2001-04-03',
        gender: 'female',
        email: 'emily.chen@student.com',
        occupation: 'University Student',
        employer: 'None',
        monthly_income: 700.0,
        savings_balance: 450.0,
        next_of_kin_name: 'Grace Chen',
        next_of_kin_phone: '+254 799 000 000',
        collateral_info: 'No Collateral',
        id_document_path: '/uploads/id-sample-5.pdf',
        document_verified: 'pending',
        document_notes: 'Awaiting student card upload & cosigner verification.',
        eligibility_status: 'pending',
        credit_score: 510,
        financial_health_score: 42,
        customer_segment: 'Student',
        debt_to_income_ratio: 0.40
      },
      {
        full_name: 'Francis Mutua',
        phone_number: '+254 711 000 111',
        national_id: '25123456',
        address: 'Changamwe, Mombasa',
        region: 'Mombasa',
        date_of_birth: '1980-01-20',
        gender: 'male',
        email: 'francis.mutua@email.com',
        occupation: 'Casual Mechanic',
        employer: 'Jua Kali Sector',
        monthly_income: 1200.0,
        savings_balance: 50.0,
        next_of_kin_name: 'Joseph Mutua',
        next_of_kin_phone: '+254 711 888 888',
        collateral_info: 'Used Toolkit',
        id_document_path: '/uploads/id-sample-6.jpg',
        document_verified: 'verified',
        document_notes: 'National ID verified, but history of loan defaults detected.',
        eligibility_status: 'ineligible',
        credit_score: 340,
        financial_health_score: 18,
        customer_segment: 'High-Risk User',
        debt_to_income_ratio: 0.88
      },
      {
        full_name: 'Grace Wambui',
        phone_number: '+254 700 222 333',
        national_id: '26456789',
        address: 'Runda, Nairobi',
        region: 'Nairobi',
        date_of_birth: '1985-09-12',
        gender: 'female',
        email: 'grace.wambui@wealthy.com',
        occupation: 'Software Tech Director',
        employer: 'Safcom Tech Innovations',
        monthly_income: 14500.0,
        savings_balance: 52000.0,
        next_of_kin_name: 'Peter Wambui',
        next_of_kin_phone: '+254 700 888 888',
        collateral_info: 'Apartment Ownership Certificate, Runda block 12',
        id_document_path: '/uploads/id-sample-7.pdf',
        document_verified: 'verified',
        document_notes: 'High net worth customer verified.',
        eligibility_status: 'eligible',
        credit_score: 830,
        financial_health_score: 95,
        customer_segment: 'Loyal Customer',
        debt_to_income_ratio: 0.08
      },
      {
        full_name: 'Henry Ndwiga',
        phone_number: '+254 722 123 789',
        national_id: '32123789',
        address: 'Kondele, Kisumu',
        region: 'Kisumu',
        date_of_birth: '1991-07-28',
        gender: 'male',
        email: 'henry.ndwiga@email.com',
        occupation: 'Operations Supervisor',
        employer: 'Bakhresa Group East Africa',
        monthly_income: 3100.0,
        savings_balance: 2800.0,
        next_of_kin_name: 'Hellen Ndwiga',
        next_of_kin_phone: '+254 722 888 123',
        collateral_info: 'No Collateral',
        id_document_path: '/uploads/id-sample-8.jpg',
        document_verified: 'verified',
        document_notes: 'Verified TSC payslip and ID record matches.',
        eligibility_status: 'eligible',
        credit_score: 690,
        financial_health_score: 68,
        customer_segment: 'Salaried Worker',
        debt_to_income_ratio: 0.25
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO borrowers (
        full_name, phone_number, national_id, address, region, date_of_birth, gender, email,
        occupation, employer, monthly_income, savings_balance, next_of_kin_name, next_of_kin_phone,
        collateral_info, id_document_path, document_verified, document_notes, eligibility_status,
        credit_score, financial_health_score, customer_segment, debt_to_income_ratio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    borrowersData.forEach(b => {
      stmt.run(
        b.full_name, b.phone_number, b.national_id, b.address, b.region, b.date_of_birth, b.gender, b.email,
        b.occupation, b.employer, b.monthly_income, b.savings_balance, b.next_of_kin_name, b.next_of_kin_phone,
        b.collateral_info, b.id_document_path, b.document_verified, b.document_notes, b.eligibility_status,
        b.credit_score, b.financial_health_score, b.customer_segment, b.debt_to_income_ratio
      );
    });
    stmt.finalize();

    console.log('Seeded borrowers.');

    // 3. Seed Loans
    const loansData = [
      {
        borrower_id: 1, // Alice
        amount: 12000.0,
        interest_rate: 8.5,
        repayment_period: 12,
        loan_product: 'Business Expansion Loan',
        purpose: 'Purchasing high-speed sewing machines for fashion workshop',
        status: 'active',
        stage: 'repayment',
        repaid_amount: 4000.0,
        due_date: getFutureDate(15),
        approved_at: getPastDate(120),
        disbursed_at: getPastDate(115),
        last_payment_date: getPastDate(20),
        ip_address: '197.248.33.102',
        device_fingerprint: 'chrome-win64-ef098a'
      },
      {
        borrower_id: 2, // Bernard
        amount: 3000.0,
        interest_rate: 10.0,
        repayment_period: 6,
        loan_product: 'Personal Advance',
        purpose: 'School fees for children in boarding school',
        status: 'active',
        stage: 'repayment',
        repaid_amount: 1500.0,
        due_date: getFutureDate(5),
        approved_at: getPastDate(60),
        disbursed_at: getPastDate(58),
        last_payment_date: getPastDate(10),
        ip_address: '102.22.45.19',
        device_fingerprint: 'safari-ios-bc118a'
      },
      {
        borrower_id: 4, // David
        amount: 18000.0,
        interest_rate: 9.0,
        repayment_period: 24,
        loan_product: 'Business Expansion Loan',
        purpose: 'Stock addition for cereal wholesale outlet',
        status: 'paid',
        stage: 'completed',
        repaid_amount: 18000.0,
        due_date: getPastDate(10),
        approved_at: getPastDate(730),
        disbursed_at: getPastDate(725),
        last_payment_date: getPastDate(10),
        ip_address: '196.201.218.4',
        device_fingerprint: 'firefox-linux-ad881b'
      },
      {
        borrower_id: 6, // Francis (Overdue!)
        amount: 2500.0,
        interest_rate: 12.0,
        repayment_period: 3,
        loan_product: 'Emergency Cash Loan',
        purpose: 'Spares purchases for vehicle repair project',
        status: 'overdue',
        stage: 'defaulted',
        repaid_amount: 400.0,
        due_date: getPastDate(45),
        approved_at: getPastDate(100),
        disbursed_at: getPastDate(98),
        last_payment_date: getPastDate(60),
        ip_address: '197.248.33.102',
        device_fingerprint: 'chrome-win64-ef098a'
      },
      {
        borrower_id: 7, // Grace
        amount: 45000.0,
        interest_rate: 7.5,
        repayment_period: 36,
        loan_product: 'Elite Premium Loan',
        purpose: 'Property purchase co-funding',
        status: 'active',
        stage: 'repayment',
        repaid_amount: 1500.0, // Re-adjusted slightly for metrics
        due_date: getFutureDate(28),
        approved_at: getPastDate(360),
        disbursed_at: getPastDate(355),
        last_payment_date: getPastDate(5),
        ip_address: '197.136.2.22',
        device_fingerprint: 'safari-mac-df998f'
      },
      {
        borrower_id: 8, // Henry (Applied and Pending)
        amount: 5000.0,
        interest_rate: 9.5,
        repayment_period: 12,
        loan_product: 'Personal Advance',
        purpose: 'Medical bills clearance',
        status: 'pending',
        stage: 'underwriting',
        repaid_amount: 0.0,
        due_date: getFutureDate(365),
        approved_at: null,
        disbursed_at: null,
        last_payment_date: null,
        ip_address: '102.22.45.19',
        device_fingerprint: 'chrome-android-22a7f9'
      }
    ];

    const stmtLoan = db.prepare(`
      INSERT INTO loans (
        borrower_id, amount, interest_rate, repayment_period, loan_product, purpose, status,
        stage, repaid_amount, due_date, approved_at, disbursed_at, last_payment_date, ip_address, device_fingerprint
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    loansData.forEach(l => {
      stmtLoan.run(
        l.borrower_id, l.amount, l.interest_rate, l.repayment_period, l.loan_product, l.purpose, l.status,
        l.stage, l.repaid_amount, l.due_date, l.approved_at, l.disbursed_at, l.last_payment_date, l.ip_address, l.device_fingerprint
      );
    });
    stmtLoan.finalize();

    console.log('Seeded advanced loans.');

    // 4. Seed Repayment Installments (linked to loans)
    const repaymentsData = [
      { loan_id: 1, amount_due: 1000.0, amount_paid: 1000.0, due_date: getPastDate(90), status: 'paid', paid_at: getPastDate(90) },
      { loan_id: 1, amount_due: 1000.0, amount_paid: 1000.0, due_date: getPastDate(60), status: 'paid', paid_at: getPastDate(59) },
      { loan_id: 1, amount_due: 1000.0, amount_paid: 1000.0, due_date: getPastDate(30), status: 'paid', paid_at: getPastDate(28) },
      { loan_id: 1, amount_due: 1000.0, amount_paid: 1000.0, due_date: getPastDate(0), status: 'paid', paid_at: getPastDate(0) },
      { loan_id: 1, amount_due: 1000.0, amount_paid: 0.0, due_date: getFutureDate(30), status: 'pending', paid_at: null },
      { loan_id: 1, amount_due: 1000.0, amount_paid: 0.0, due_date: getFutureDate(60), status: 'pending', paid_at: null },

      { loan_id: 2, amount_due: 500.0, amount_paid: 500.0, due_date: getPastDate(40), status: 'paid', paid_at: getPastDate(40) },
      { loan_id: 2, amount_due: 500.0, amount_paid: 500.0, due_date: getPastDate(10), status: 'paid', paid_at: getPastDate(10) },
      { loan_id: 2, amount_due: 500.0, amount_paid: 500.0, due_date: getPastDate(2), status: 'paid', paid_at: getPastDate(2) },
      { loan_id: 2, amount_due: 500.0, amount_paid: 0.0, due_date: getFutureDate(28), status: 'pending', paid_at: null },

      { loan_id: 4, amount_due: 833.0, amount_paid: 400.0, due_date: getPastDate(60), status: 'overdue', paid_at: null },
      { loan_id: 4, amount_due: 833.0, amount_paid: 0.0, due_date: getPastDate(30), status: 'overdue', paid_at: null },
      { loan_id: 4, amount_due: 834.0, amount_paid: 0.0, due_date: getPastDate(0), status: 'overdue', paid_at: null }
    ];

    const stmtRep = db.prepare(`
      INSERT INTO repayments (loan_id, amount_due, amount_paid, due_date, status, paid_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    repaymentsData.forEach(r => {
      stmtRep.run(r.loan_id, r.amount_due, r.amount_paid, r.due_date, r.status, r.paid_at);
    });
    stmtRep.finalize();

    console.log('Seeded repayments.');

    // 5. Seed Collection Tasks (linked to Francis overdue loan_id = 4)
    db.run(`
      INSERT INTO collection_tasks (loan_id, assignee, recovery_status, last_contact_date, notes)
      VALUES (4, 'Admin Officer', 'contacted', '${getPastDate(3)}', 'Borrower was argumentative. Promised payment next Tuesday.')
    `);

    // 6. Seed Fraud Alerts
    db.run(`
      INSERT INTO fraud_alerts (borrower_id, risk_level, reason, status)
      VALUES (3, 'high', 'Duplicate Application: Suspicious identity details. Selfie does not match National ID records.', 'flagged')
    `);
    db.run(`
      INSERT INTO fraud_alerts (borrower_id, risk_level, reason, status)
      VALUES (6, 'medium', 'IP & Fingerprint Collision: Registered from the exact same workstation, IP, and hardware fingerprint as high-tier borrower Alice Kamau.', 'investigating')
    `);

    // 7. Seed initial system audit logs
    db.run("INSERT INTO audit_logs (user_email, action, details, ip_address) VALUES ('system', 'INIT', 'System initialization and schema database V2.4 established.', '127.0.0.1')");
    db.run("INSERT INTO audit_logs (user_email, action, details, ip_address) VALUES ('system', 'SEED', 'Standard high-fidelity administrative testing dataset seeded successfully.', '127.0.0.1')");

    // 8. Seed API Integrations
    db.run("INSERT INTO api_integrations (name, key_value, status) VALUES ('mpesa', 'mpesa_client_id_live_928k12c9842a', 'online')");
    db.run("INSERT INTO api_integrations (name, key_value, status) VALUES ('sms', 'QUICKCASH_SMS', 'online')");
    db.run("INSERT INTO api_integrations (name, key_value, status) VALUES ('bank', 'payout_routing_gateway_live_83a18a93e110', 'online')");
    db.run("INSERT INTO api_integrations (name, key_value, status) VALUES ('crb', 'crb_bureau_token_auth_8312d93e1102', 'online')");

    console.log('Seeded initial audit logs and API integrations.');
    console.log('Seeding fully completed.');
  });
};

export default db;
