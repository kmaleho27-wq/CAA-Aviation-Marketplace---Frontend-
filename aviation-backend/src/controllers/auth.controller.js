const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// In-memory users - pre-seeded with test account
let users = [
  { 
    email: 'test@aviation.com', 
    password: '$2b$10$YIjlrN8Z8Z8Z8Z8Z8Z8Z8uZ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z', // password123 hashed
    role: 'AME' 
  }
];

const register = async (req, res) => {
  const { email, password, role } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  if (!['AMO', 'AME'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Check if user exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = { email, password: hashed, role };
  users.push(user);

  res.status(201).json({ message: 'User registered successfully!', email, role });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { email: user.email, role: user.role },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '7d' }
    );

    res.json({ token, role: user.role, email: user.email, message: 'Login successful!' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login };