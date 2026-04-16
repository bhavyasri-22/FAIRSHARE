const express    = require('express');
const mongoose   = require('mongoose');
const dotenv     = require('dotenv');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const http       = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app    = express();
const server = http.createServer(app);

app.set('trust proxy', 1);
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ── SOCKET.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  },
});

module.exports.io = io;

// Track which socket belongs to which userId (for chat notifications)
// socketId → userId
const socketUserMap = {};
// userId → Set of socketIds (a user may have multiple tabs)
const userSocketMap = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // ── User joins their personal notification room ──────────
  socket.on('join_user', (userId) => {
    const uid = String(userId);
    socketUserMap[socket.id] = uid;
    if (!userSocketMap[uid]) userSocketMap[uid] = new Set();
    userSocketMap[uid].add(socket.id);
    socket.join(`user_${uid}`);
    console.log(`User ${uid} joined personal room`);
  });

  // ── User joins a group room (for chat + live updates) ────
  socket.on('join_group', (groupId) => {
    socket.join(groupId.toString());
  });

  // ── Chat message ─────────────────────────────────────────
  socket.on('send_message', async ({ groupId, userId, text }) => {
    try {
      const Message = require('./models/Message');
      const Group   = require('./models/Group');

      const message      = await Message.create({ group: groupId, sender: userId, text });
      const populatedMsg = await message.populate('sender', 'name');

      // Broadcast message to everyone in the group room
      io.to(groupId.toString()).emit('receive_message', populatedMsg);

      // ── Notify every group member who is NOT the sender ──
      const group = await Group.findById(groupId).select('members name');
      if (group) {
        const senderName = populatedMsg.sender?.name || 'Someone';
        const preview    = text.length > 40 ? text.slice(0, 40) + '…' : text;

        group.members.forEach(memberId => {
          const mid = String(memberId);
          if (mid === String(userId)) return; // skip sender

          io.to(`user_${mid}`).emit('notification', {
            type:      'chat_message',
            groupId:   String(groupId),
            groupName: group.name,
            message:   `${senderName}: ${preview}`,
            at:        new Date().toISOString(),
          });
        });
      }
    } catch (err) {
      console.error('Socket message error:', err);
    }
  });

  // ── Cleanup on disconnect ─────────────────────────────────
  socket.on('disconnect', () => {
    const uid = socketUserMap[socket.id];
    if (uid && userSocketMap[uid]) {
      userSocketMap[uid].delete(socket.id);
      if (userSocketMap[uid].size === 0) delete userSocketMap[uid];
    }
    delete socketUserMap[socket.id];
    console.log('User disconnected:', socket.id);
  });
});

// ── RATE LIMITERS ────────────────────────────────────────────
const rateLimitHandler = (req, res) =>
  res.status(429).json({ success: false, message: 'Too many requests. Please slow down and try again later.' });

const authLimiter    = rateLimit({ windowMs: 15*60*1000, max: 10,  standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler });
const writeLimiter   = rateLimit({ windowMs: 15*60*1000, max: 60,  standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler });
const generalLimiter = rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler });

app.use('/api', generalLimiter);

// ── ROUTES ───────────────────────────────────────────────────
const authRoutes       = require('./routes/authRoutes');
const groupRoutes      = require('./routes/groupRoutes');
const expenseRoutes    = require('./routes/expenseRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const messageRoutes    = require('./routes/messageRoutes');
const analyticsRoutes  = require('./routes/analyticsRoutes');
const receiptRoutes    = require('./routes/receiptRoutes');
const paymentRoutes    = require('./routes/paymentRoutes');    // Razorpay

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

app.use('/api/auth',        authLimiter,  authRoutes);
app.use('/api/groups',                    groupRoutes);
app.use('/api/expenses',    writeLimiter, expenseRoutes);
app.use('/api/settlements', writeLimiter, settlementRoutes);
app.use('/api/messages',                  messageRoutes);
app.use('/api/analytics',                 analyticsRoutes);
app.use('/api/receipts',    writeLimiter, receiptRoutes); 
app.use('/api/payments',   writeLimiter, paymentRoutes);    // Razorpay


// ── START ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));