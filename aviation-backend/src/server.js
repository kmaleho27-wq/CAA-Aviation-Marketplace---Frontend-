require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');

const app = express();

// CORS fix — allows localhost:5173 (your frontend) to connect
app.use(cors());

app.use(helmet());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Aeromarket Aviation Backend - Connected and Ready ✈️' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});