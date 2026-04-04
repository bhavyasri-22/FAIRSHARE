const express   = require('express');
const mongoose  = require('mongoose');
const dotenv    = require('dotenv');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const http      = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// ── SOCKET.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_group', (groupId) => {
    socket.join(groupId);
  });

  socket.on('send_message', async ({ groupId, userId, text }) => {
    try {
      const Message = require('./models/Message');

      const message = await Message.create({
        group: groupId,
        sender: userId,
        text,
      });

      const populatedMsg = await message.populate('sender', 'name');

      io.to(groupId).emit('receive_message', populatedMsg);
    } catch (err) {
      console.error('Socket message error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// ── RATE LIMITERS ────────────────────────────────────────────
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please slow down and try again later.'
  });
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

app.use('/api', generalLimiter);

// ── ROUTES ───────────────────────────────────────────────────
const authRoutes       = require('./routes/authRoutes');
const groupRoutes      = require('./routes/groupRoutes');
const expenseRoutes    = require('./routes/expenseRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const messageRoutes    = require('./routes/messageRoutes');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

app.use('/api/auth',        authLimiter, authRoutes);
app.use('/api/groups',      groupRoutes);
app.use('/api/expenses',    writeLimiter, expenseRoutes);
app.use('/api/settlements', writeLimiter, settlementRoutes);
app.use('/api/messages',    messageRoutes);

// ── START SERVER ─────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});