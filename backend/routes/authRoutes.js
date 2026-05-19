import express from 'express';
import { login } from '../controllers/authController.js';

const router = express.Router();

// Lightweight, zero-dependency in-memory IP rate limiter to block brute-force attacks on login
const loginAttempts = new Map();

const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const timeframe = 60 * 1000; // 1 minute
  const maxAttempts = 5;

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, []);
  }

  const attempts = loginAttempts.get(ip).filter(timestamp => now - timestamp < timeframe);
  attempts.push(now);
  loginAttempts.set(ip, attempts);

  if (attempts.length > maxAttempts) {
    return res.status(429).json({
      message: 'Too many authentication attempts. Please try again after 60 seconds.'
    });
  }

  next();
};

router.post('/login', loginRateLimiter, login);

export default router;
