const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Fake in-memory users for testing (will be replaced with database later)
const users = [];

const register = async (req, res) => {
  const { email, password, role } = req.body;
  if (!['AMO', 'AME'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  // Check if user exists
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = { email, password: hashed, role };
  users.push(user);

  res.status(201).json({ message: 'User registered successfully!' });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { email: user.email, role: user.role },
    process.env.JWT_SECRET || 'testsecret',
    { expiresIn: '7d' }
  );

  res.json({ token, role: user.role, message: 'Login successful!' });
};

module.exports = { register, login };