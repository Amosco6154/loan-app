import db, { verifyPassword } from '../config/db.js';

export const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role === 'admin') {
       return res.json({ message: 'Login successful', user });
    }

    return res.status(403).json({ message: 'Access denied' });
  });
};
