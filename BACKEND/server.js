// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

// Import routes
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);    // Auth routes (register/login)
app.use('/api/groups', groupRoutes); // Group routes (create/join/fetch)
app.use('/api/expenses', expenseRoutes);

// Start server
const PORT = process.env.PORT || 4000; // Use 4000 to avoid AirTunes conflicts on Mac
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));