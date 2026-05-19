import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import loanRoutes from './routes/loanRoutes.js';
import authRoutes from './routes/authRoutes.js';
import borrowerRoutes from './routes/borrowerRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Note: Serve uploaded documents securely via protected borrower routes instead of static public hosting

app.use('/api/auth', authRoutes);
app.use('/api/borrowers', borrowerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/integrations', integrationRoutes);

app.get('/', (req, res) => {
  res.send('Loan Management API is running...');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

