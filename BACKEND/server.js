const express   = require('express');
const mongoose  = require('mongoose');
const dotenv    = require('dotenv');
const cors      = require('cors');

dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Routes
const authRoutes       = require('./routes/authRoutes');
const groupRoutes      = require('./routes/groupRoutes');
const expenseRoutes    = require('./routes/expenseRoutes');
const settlementRoutes = require('./routes/settlementRoutes'); // ✅ new
const analyticsRoutes  = require('./routes/analyticsRoutes');  // ✅ analytics

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

app.use('/api/auth',        authRoutes);
app.use('/api/groups',      groupRoutes);
app.use('/api/expenses',    expenseRoutes);
app.use('/api/settlements', settlementRoutes); // ✅ new
app.use('/api/analytics',  analyticsRoutes);  // ✅ analytics

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));