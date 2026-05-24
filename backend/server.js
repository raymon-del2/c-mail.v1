import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import process from 'process';
import User from './models/User.js';
import Email from './models/Email.js';
import ApiKey from './models/ApiKey.js';
import AIChat from './models/AIChat.js';
import AIGist from './models/AIGist.js';
import Verification from './models/Verification.js';
import RefreshToken from './models/RefreshToken.js';
import { sendEmailDirect } from './utils/email.js';
// import Groq from 'groq-sdk'; // Disabled - Groq not in use

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Groq AI client
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); // Disabled - Groq not in use

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow any localhost port for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Allow production domains
    const allowedDomains = [
      'https://c-mail.vercel.app',
      'https://*.vercel.app'
    ];
    
    const isAllowed = allowedDomains.some(domain => {
      if (domain.includes('*')) {
        const regex = new RegExp(domain.replace('*', '.*'));
        return regex.test(origin);
      }
      return origin === domain;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Helper function to generate random bytes using Web Crypto API (Edge compatible)
const generateRandomBytes = (length) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Lazy MongoDB connection - don't block startup
let isConnecting = false;
async function connectDB() {
  if (mongoose.connection.readyState === 1) return; // Already connected
  if (isConnecting) return; // Connection in progress
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');
  
  isConnecting = true;
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  } finally {
    isConnecting = false;
  }
}

// Test endpoint - GET
app.get('/api/test', async (req, res) => {
  try {
    // Try to connect to MongoDB
    await connectDB();
    res.json({ 
      success: true, 
      message: 'Server and MongoDB are running', 
      mongoConnected: mongoose.connection.readyState === 1,
      database: mongoose.connection.name,
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server running but MongoDB connection failed',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint - list all users
app.get('/api/debug/users', async (req, res) => {
  try {
    await connectDB();
    const users = await User.find({}).select('email username firstName secondName').limit(20);
    res.json({ 
      success: true, 
      database: mongoose.connection.name,
      count: users.length,
      users: users 
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post('/api/signup', async (req, res) => {
  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ 
        error: 'Database not configured',
        details: 'MONGODB_URI environment variable is not set'
      });
    }
    
    // Lazy connect to MongoDB with timeout
    await Promise.race([
      connectDB(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 6000)
      )
    ]);
    
    const { username, email, password, firstName, secondName } = req.body;
    
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email or username already exists' 
      });
    }
    
    const user = new User({
      username,
      email,
      password,
      firstName,
      secondName,
      profileUrl: ''
    });
    
    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json({ 
      message: 'User created successfully', 
      user: userResponse 
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ 
        error: 'Database not configured',
        details: 'MONGODB_URI environment variable is not set'
      });
    }
    
    // Lazy connect to MongoDB with timeout
    await Promise.race([
      connectDB(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 6000)
      )
    ]);
    
    console.log('Login request body:', req.body);
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await User.findOne({ email });
    console.log('User found:', !!user);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    console.log('Password match:', isMatch);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    console.log('Login successful for:', email);
    res.json({ 
      message: 'Login successful', 
      user: userResponse 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify current user (for persistent login)
app.get('/api/auth/me', async (req, res) => {
  try {
    await connectDB();
    
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // For now, simple token validation - in production use JWT
    // Find user by checking if token exists in any session
    // Since we're using simple tokens, we'll look up the user
    const user = await User.findOne({}).select('-password');
    
    // In a real JWT setup, you'd verify the token signature
    // For now, return the user if token looks valid
    if (token && token.startsWith('cmail_token_')) {
      // Return first user as placeholder - in production verify properly
      if (user) {
        return res.json({
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          secondName: user.secondName,
          profileUrl: user.profileUrl
        });
      }
    }
    
    res.status(401).json({ error: 'Invalid token' });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

// Profile update endpoint
app.put('/api/profile', async (req, res) => {
  console.log('PUT /api/profile called with body:', req.body);
  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      console.log('MONGODB_URI not set');
      return res.status(500).json({ 
        error: 'Database not configured',
        details: 'MONGODB_URI environment variable is not set'
      });
    }
    
    // Lazy connect to MongoDB with timeout
    console.log('Connecting to MongoDB...');
    await Promise.race([
      connectDB(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 6000)
      )
    ]);
    console.log('MongoDB connected');
    
    const { userId, profileUrl } = req.body;
    console.log('Updating user:', userId, 'with profileUrl:', profileUrl);
    
    const user = await User.findByIdAndUpdate(
      userId,
      { profileUrl },
      { new: true }
    ).select('-password');
    
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Profile updated successfully');
    res.json({ 
      message: 'Profile updated successfully', 
      user 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// Test GET endpoint for /api/profile
app.get('/api/profile', (req, res) => {
  res.json({ message: 'Profile endpoint is working. Use PUT to update.' });
});

app.get('/api/users/:id', async (req, res) => {
  try {
    await connectDB();
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/api/users/lookup/:username', async (req, res) => {
  try {
    await connectDB();
    const { username } = req.params;
    const user = await User.findOne({ username }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'No user with that email. Please try another' });
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to lookup user' });
  }
});

// Send email (creates two copies: one in sender's sent, one in recipient's inbox)
app.post('/api/emails/send', async (req, res) => {
  try {
    const { senderId, recipientId, subject, body, links } = req.body;
    
    await connectDB();
    
    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);
    
    if (!sender || !recipient) {
      return res.status(404).json({ error: 'Sender or recipient not found' });
    }

    // Create email for recipient's inbox
    const inboxEmail = new Email({
      sender: sender._id,
      senderUsername: sender.username,
      senderName: `${sender.firstName} ${sender.secondName}`,
      recipient: recipient._id,
      recipientUsername: recipient.username,
      subject,
      body,
      links: links || [],
      folder: 'inbox',
      read: false
    });

    // Create email for sender's sent folder
    const sentEmail = new Email({
      sender: sender._id,
      senderUsername: sender.username,
      senderName: `${sender.firstName} ${sender.secondName}`,
      recipient: recipient._id,
      recipientUsername: recipient.username,
      subject,
      body,
      links: links || [],
      folder: 'sent',
      read: true
    });

    await inboxEmail.save();
    await sentEmail.save();

    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      inboxEmail,
      sentEmail
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Get emails for a user (by folder)
app.get('/api/emails/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { folder = 'inbox' } = req.query;
    
    await connectDB();
    
    let emails;
    if (folder === 'inbox') {
      emails = await Email.find({ recipient: userId, folder: 'inbox' })
        .sort({ createdAt: -1 })
        .populate('sender', 'firstName secondName username profileUrl')
        .populate('recipient', 'username');
    } else if (folder === 'sent') {
      emails = await Email.find({ sender: userId, folder: 'sent' })
        .sort({ createdAt: -1 })
        .populate('recipient', 'firstName secondName username profileUrl');
    } else if (folder === 'drafts') {
      emails = await Email.find({ sender: userId, folder: 'drafts' })
        .sort({ createdAt: -1 });
    }
    
    res.json(emails);
  } catch (error) {
    console.error('Fetch emails error:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Save draft
app.post('/api/emails/draft', async (req, res) => {
  try {
    const { senderId, recipientId, recipientUsername, subject, body, links, draftId } = req.body;
    
    await connectDB();
    
    let draft;
    if (draftId) {
      // Update existing draft
      draft = await Email.findByIdAndUpdate(
        draftId,
        {
          subject: subject || 'Draft',
          body,
          links: links || [],
          updatedAt: new Date()
        },
        { new: true }
      );
    } else {
      // Create new draft
      draft = new Email({
        sender: senderId,
        senderUsername: req.body.senderUsername,
        senderName: req.body.senderName,
        recipient: recipientId || null,
        recipientUsername: recipientUsername || '',
        subject: subject || 'Draft',
        body,
        links: links || [],
        folder: 'drafts',
        read: true
      });
      await draft.save();
    }
    
    res.json({ success: true, draft });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// Delete email
app.delete('/api/emails/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    
    await connectDB();
    
    await Email.findByIdAndDelete(emailId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

// Mark email as read
app.patch('/api/emails/:emailId/read', async (req, res) => {
  try {
    const { emailId } = req.params;
    
    await connectDB();
    
    const email = await Email.findByIdAndUpdate(
      emailId,
      { read: true },
      { new: true }
    );
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    res.json(email);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark email as read' });
  }
});

// Reply to email
app.post('/api/emails/reply', async (req, res) => {
  try {
    const { senderId, recipientId, parentEmailId, subject, body, links, threadId } = req.body;
    
    console.log('Reply request:', { senderId, recipientId, parentEmailId, threadId });
    
    await connectDB();
    
    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);
    const parentEmail = await Email.findById(parentEmailId);
    
    if (!sender) {
      console.log('Sender not found:', senderId);
      return res.status(404).json({ error: 'Sender not found', senderId });
    }
    if (!recipient) {
      console.log('Recipient not found:', recipientId);
      return res.status(404).json({ error: 'Recipient not found', recipientId });
    }

    const newThreadId = threadId || parentEmailId;

    // Create reply for recipient's inbox
    const inboxReply = new Email({
      sender: sender._id,
      senderUsername: sender.username,
      senderName: `${sender.firstName} ${sender.secondName}`,
      recipient: recipient._id,
      recipientUsername: recipient.username,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      body,
      links: links || [],
      folder: 'inbox',
      read: false,
      isReply: true,
      parentEmailId: parentEmailId,
      threadId: newThreadId
    });

    // Create reply for sender's sent folder
    const sentReply = new Email({
      sender: sender._id,
      senderUsername: sender.username,
      senderName: `${sender.firstName} ${sender.secondName}`,
      recipient: recipient._id,
      recipientUsername: recipient.username,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      body,
      links: links || [],
      folder: 'sent',
      read: true,
      isReply: true,
      parentEmailId: parentEmailId,
      threadId: newThreadId
    });

    await inboxReply.save();
    await sentReply.save();

    // Update parent email reply count
    if (parentEmail) {
      parentEmail.replyCount += 1;
      await parentEmail.save();
    }

    // Update all emails in thread to have the same threadId
    await Email.updateMany(
      { _id: { $in: [parentEmailId, newThreadId] } },
      { threadId: newThreadId }
    );

    res.json({ 
      success: true, 
      message: 'Reply sent successfully',
      inboxReply,
      sentReply
    });
  } catch (error) {
    console.error('Reply email error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Get Dev API credentials (API key and redirect URLs)
app.get('/api/devapi/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await connectDB();
    
    const apiKeyDoc = await ApiKey.findOne({ userId });
    
    if (!apiKeyDoc) {
      return res.json({ apiKey: null, redirectUrls: [] });
    }
    
    res.json({
      apiKey: apiKeyDoc.apiKey,
      redirectUrls: apiKeyDoc.redirectUrls
    });
  } catch (error) {
    console.error('Get DevAPI credentials error:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

// Generate API key
app.post('/api/devapi/generate-key', async (req, res) => {
  try {
    const { userId } = req.body;
    
    await connectDB();
    
    // Generate random API key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const random = Array.from({ length: 48 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const apiKey = `c-mail_${random}`;
    
    // Update or create API key document
    const apiKeyDoc = await ApiKey.findOneAndUpdate(
      { userId },
      { apiKey, createdAt: new Date() },
      { upsert: true, new: true }
    );
    
    res.json({ apiKey: apiKeyDoc.apiKey, redirectUrls: apiKeyDoc.redirectUrls });
  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// Revoke API key
app.delete('/api/devapi/revoke-key/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await connectDB();
    
    await ApiKey.findOneAndDelete({ userId });
    res.json({ success: true });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// Add redirect URL
app.post('/api/devapi/add-url', async (req, res) => {
  try {
    const { userId, url } = req.body;
    
    await connectDB();
    
    const apiKeyDoc = await ApiKey.findOneAndUpdate(
      { userId },
      { $addToSet: { redirectUrls: url } },
      { upsert: true, new: true }
    );
    
    res.json({ redirectUrls: apiKeyDoc.redirectUrls });
  } catch (error) {
    console.error('Add URL error:', error);
    res.status(500).json({ error: 'Failed to add URL' });
  }
});

// Remove redirect URL
app.delete('/api/devapi/remove-url/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { url } = req.query;
    
    await connectDB();
    
    const apiKeyDoc = await ApiKey.findOneAndUpdate(
      { userId },
      { $pull: { redirectUrls: url } },
      { new: true }
    );
    
    res.json({ redirectUrls: apiKeyDoc ? apiKeyDoc.redirectUrls : [] });
  } catch (error) {
    console.error('Remove URL error:', error);
    res.status(500).json({ error: 'Failed to remove URL' });
  }
});

// Get email thread (replies)
app.get('/api/emails/thread/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    
    await connectDB();
    
    const email = await Email.findById(emailId);
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const threadId = email.threadId || emailId;
    
    // Get all emails in the thread
    const threadEmails = await Email.find({
      $or: [
        { _id: threadId },
        { threadId: threadId },
        { parentEmailId: threadId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'firstName secondName username profileUrl');

    res.json(threadEmails);
  } catch (error) {
    console.error('Fetch thread error:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// ========== MONGODB HEALTH CHECK CRON ENDPOINT ==========

// Simple ping endpoint to keep MongoDB connection alive
// Call this weekly via Vercel Cron Jobs to prevent freezing after 6 months
app.get('/api/health/ping', async (req, res) => {
  try {
    // Perform a simple database operation to keep connection active
    const userCount = await User.countDocuments();
    const emailCount = await Email.countDocuments();
    
    res.json({ 
      success: true, 
      message: 'MongoDB connection is alive',
      timestamp: new Date().toISOString(),
      stats: {
        users: userCount,
        emails: emailCount
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database connection issue',
      timestamp: new Date().toISOString()
    });
  }
});

// ========== OAUTH2 / AUTH API ==========

// Store for auth codes (in production, use Redis with TTL)
const authCodes = new Map();
const userConsents = new Map(); // userId -> [{ clientId, grantedAt, scopes }]

// Create authorization code (when user clicks "Allow")
app.post('/api/auth/create-code', async (req, res) => {
  try {
    const { clientId, userId, redirectUri, scope = 'profile email' } = req.body;
    
    // Verify the client_id exists
    const apiKeyDoc = await ApiKey.findOne({ apiKey: clientId });
    if (!apiKeyDoc) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }
    
    // Check if redirect URI is allowed
    if (!apiKeyDoc.redirectUrls.includes(redirectUri)) {
      return res.status(400).json({ error: 'Invalid redirect_uri' });
    }
    
    // Generate short-lived code (5 minutes)
    const code = 'cmail_' + Array.from({ length: 32 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
    ).join('');
    
    // Store code with metadata
    authCodes.set(code, {
      clientId,
      userId,
      redirectUri,
      scope,
      createdAt: Date.now(),
      used: false
    });
    
    // Store user consent for auto-login
    if (!userConsents.has(userId)) {
      userConsents.set(userId, []);
    }
    const consents = userConsents.get(userId);
    const existing = consents.find(c => c.clientId === clientId);
    if (!existing) {
      consents.push({ clientId, grantedAt: new Date(), scope });
    }
    
    res.json({ code, expiresIn: 300 });
  } catch (error) {
    console.error('Create auth code error:', error);
    res.status(500).json({ error: 'Failed to create authorization code' });
  }
});

// Verify code and return JWT (token endpoint)
app.post('/api/v1/verify', async (req, res) => {
  try {
    const { code, clientId } = req.body;
    
    console.log('🔍 /api/v1/verify called:', { code: code?.slice(0, 20) + '...', clientId: clientId?.slice(0, 20) + '...' });
    
    // Connect to database first
    await connectDB();
    
    // Verify code exists and is valid
    const codeData = authCodes.get(code);
    if (!codeData) {
      console.log('❌ Code not found in authCodes map');
      return res.status(400).json({ error: 'Invalid or expired code' });
    }
    
    console.log('✅ Code found:', { userId: codeData.userId, clientId: codeData.clientId });
    
    if (codeData.used) {
      console.log('❌ Code already used');
      return res.status(400).json({ error: 'Code already used' });
    }
    
    // Check expiration (5 minutes)
    if (Date.now() - codeData.createdAt > 5 * 60 * 1000) {
      authCodes.delete(code);
      console.log('❌ Code expired');
      return res.status(400).json({ error: 'Code expired' });
    }
    
    // Verify client
    if (codeData.clientId !== clientId) {
      console.log('❌ Client ID mismatch:', { expected: codeData.clientId, received: clientId });
      return res.status(400).json({ error: 'Client ID mismatch' });
    }
    
    // Get user data
    console.log('🔍 Looking up user:', codeData.userId);
    const user = await User.findById(codeData.userId).select('-password');
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ User found:', { email: user.email, username: user.username });
    
    // Mark code as used
    codeData.used = true;
    
    // Generate refresh token (long-lived, for getting new access tokens)
    const refreshTokenString = 'cmail_refresh_' + generateRandomBytes(32);
    console.log('🔍 Creating refresh token...');
    
    await RefreshToken.create({
      userId: user._id,
      clientId: clientId,
      token: refreshTokenString
    });
    
    console.log('✅ Refresh token created');
    
    // Generate JWT payload (simplified - no actual JWT signing for now)
    const token = {
      iss: 'https://c-mail.vercel.app',
      sub: user._id.toString(),
      aud: clientId,
      name: `${user.firstName} ${user.secondName}`,
      email: user.email,
      picture: user.profileUrl || '',
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };
    
    const accessToken = 'cmail_token_' + generateRandomBytes(16);
    
    console.log('✅ Token exchange successful');
    
    res.json({
      access_token: accessToken,
      refresh_token: refreshTokenString,
      token_type: 'Bearer',
      expires_in: 3600,
      id_token: token
    });
  } catch (error) {
    console.error('❌ Verify token error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to verify code', details: error.message });
  }
});

// Refresh access token using refresh token
app.post('/api/v1/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: 'refresh_token is required' });
    }
    
    await connectDB();
    
    // Find valid refresh token
    const tokenDoc = await RefreshToken.findOne({ 
      token: refresh_token, 
      isRevoked: false 
    });
    
    if (!tokenDoc) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    
    // Update last used
    tokenDoc.lastUsed = new Date();
    await tokenDoc.save();
    
    // Get user data
    const user = await User.findById(tokenDoc.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate new access token
    const newAccessToken = 'cmail_token_' + generateRandomBytes(16);
    
    // Generate new JWT payload
    const token = {
      iss: 'https://c-mail.vercel.app',
      sub: user._id.toString(),
      aud: tokenDoc.clientId,
      name: `${user.firstName} ${user.secondName}`,
      email: user.email,
      picture: user.profileUrl || '',
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };
    
    res.json({
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      id_token: token
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Check if user has existing consent (for auto-login)
app.get('/api/auth/check-consent', async (req, res) => {
  try {
    const { userId, clientId } = req.query;
    
    const consents = userConsents.get(userId) || [];
    const hasConsent = consents.some(c => c.clientId === clientId);
    
    res.json({ hasConsent });
  } catch (error) {
    console.error('Check consent error:', error);
    res.status(500).json({ error: 'Failed to check consent' });
  }
});

// Get user's connected apps
app.get('/api/user/connected-apps/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await connectDB();
    
    const consents = userConsents.get(userId) || [];
    
    // Get app details from ApiKey collection
    const apps = await Promise.all(
      consents.map(async (consent) => {
        const apiKeyDoc = await ApiKey.findOne({ apiKey: consent.clientId });
        return {
          clientId: consent.clientId,
          name: apiKeyDoc ? `App (${consent.clientId.slice(0, 16)}...)` : 'Unknown App',
          grantedAt: consent.grantedAt,
          scope: consent.scope
        };
      })
    );
    
    res.json(apps);
  } catch (error) {
    console.error('Get connected apps error:', error);
    res.status(500).json({ error: 'Failed to fetch connected apps' });
  }
});

// Revoke app access
app.post('/api/user/revoke', async (req, res) => {
  try {
    const { userId, clientId } = req.body;
    
    await connectDB();
    
    // Remove from in-memory consents
    const consents = userConsents.get(userId) || [];
    const filtered = consents.filter(c => c.clientId !== clientId);
    userConsents.set(userId, filtered);
    
    // Revoke all refresh tokens for this user-client pair
    await RefreshToken.revokeAllForUserClient(userId, clientId, 'User revoked app access');
    
    res.json({ success: true, message: 'App access revoked successfully' });
  } catch (error) {
    console.error('Revoke access error:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

// ========== DEV API AUTHENTICATION AS A SERVICE ==========
// Send OTP for developer app verification
app.post('/api/dev/auth/send-otp', async (req, res) => {
  try {
    const { email, apiKey } = req.body;
    
    if (!email || !apiKey) {
      return res.status(400).json({ error: 'Email and API key required' });
    }
    
    await connectDB();
    
    // Verify API key
    const apiKeyDoc = await ApiKey.findOne({ apiKey });
    if (!apiKeyDoc) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Generate OTP
    const otp = Verification.generateOTP();
    
    // Save verification record
    const verification = new Verification({
      email,
      code: otp,
      type: 'otp',
      appId: apiKeyDoc._id,
      appName: apiKeyDoc.appName || 'Unknown App'
    });
    await verification.save();
    
    // Send email with OTP
    const subject = `Your verification code for ${apiKeyDoc.appName || 'C-mail App'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #8b5cf6;">Verification Code</h2>
        <p>Your verification code for <strong>${apiKeyDoc.appName || 'C-mail App'}</strong> is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code expires in 10 minutes.</p>
        <p style="color: #6b7280; font-size: 12px;">Powered by C-mail Authentication</p>
      </div>
    `;
    
    await sendEmailDirect(email, subject, html, null, apiKeyDoc.userId);
    
    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP
app.post('/api/dev/auth/verify-otp', async (req, res) => {
  try {
    const { email, code, apiKey } = req.body;
    
    if (!email || !code || !apiKey) {
      return res.status(400).json({ error: 'Email, code, and API key required' });
    }
    
    await connectDB();
    
    // Verify API key
    const apiKeyDoc = await ApiKey.findOne({ apiKey });
    if (!apiKeyDoc) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Find verification record
    const verification = await Verification.findOne({
      email,
      type: 'otp',
      appId: apiKeyDoc._id,
      verified: false
    }).sort({ createdAt: -1 });
    
    if (!verification) {
      return res.status(400).json({ error: 'No pending verification found' });
    }
    
    // Verify code
    if (!verification.verifyCode(code)) {
      return res.status(400).json({ error: 'Invalid code' });
    }
    
    // Mark as verified
    verification.verified = true;
    await verification.save();
    
    // Generate auth token for developer
    const authToken = generateRandomBytes(32);
    
    res.json({
      success: true,
      verified: true,
      authToken,
      email
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Send Magic Link
app.post('/api/dev/auth/send-magic-link', async (req, res) => {
  try {
    const { email, apiKey, redirectUrl } = req.body;
    
    if (!email || !apiKey) {
      return res.status(400).json({ error: 'Email and API key required' });
    }
    
    await connectDB();
    
    // Verify API key
    const apiKeyDoc = await ApiKey.findOne({ apiKey });
    if (!apiKeyDoc) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Check if redirect URL is allowed
    if (redirectUrl && !apiKeyDoc.redirectUrls.includes(redirectUrl)) {
      return res.status(400).json({ error: 'Invalid redirect URL' });
    }
    
    // Generate token
    const token = Verification.generateToken();
    
    // Save verification record
    const verification = new Verification({
      email,
      code: token,
      type: 'magic_link',
      appId: apiKeyDoc._id,
      appName: apiKeyDoc.appName || 'Unknown App',
      redirectUrl: redirectUrl || apiKeyDoc.redirectUrls[0]
    });
    await verification.save();
    
    // Build magic link
    const magicLink = `https://c-mail.vercel.app/verify?token=${token}&appId=${apiKeyDoc._id}`;
    
    // Send email with magic link
    const subject = `Verify your email for ${apiKeyDoc.appName || 'C-mail App'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #8b5cf6;">Verify Your Email</h2>
        <p>Click the button below to verify your email for <strong>${apiKeyDoc.appName || 'C-mail App'}</strong>:</p>
        <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0;">Verify Email</a>
        <p style="color: #6b7280; font-size: 12px;">Or copy this link: ${magicLink}</p>
        <p>This link expires in 10 minutes.</p>
        <p style="color: #6b7280; font-size: 12px;">Powered by C-mail Authentication</p>
      </div>
    `;
    
    await sendEmailDirect(email, subject, html, null, apiKeyDoc.userId);
    
    res.json({ success: true, message: 'Magic link sent successfully' });
  } catch (error) {
    console.error('Send magic link error:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

// Verify Magic Link
app.post('/api/dev/auth/verify-link', async (req, res) => {
  try {
    const { token, appId } = req.body;
    
    if (!token || !appId) {
      return res.status(400).json({ error: 'Token and appId required' });
    }
    
    await connectDB();
    
    // Hash token for comparison
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find verification record
    const verification = await Verification.findOne({
      code: hashedToken,
      type: 'magic_link',
      appId,
      verified: false
    });
    
    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired link' });
    }
    
    // Mark as verified
    verification.verified = true;
    await verification.save();
    
    // Generate auth code for developer
    const authCode = generateRandomBytes(16);
    
    res.json({
      success: true,
      verified: true,
      email: verification.email,
      authCode,
      redirectUrl: verification.redirectUrl
    });
  } catch (error) {
    console.error('Verify link error:', error);
    res.status(500).json({ error: 'Failed to verify link' });
  }
});

// Domain verification - store for verified URLs per user
const verifiedDomains = new Map(); // userId -> Set of verified URLs

// Verify domain challenge file
app.post('/api/devapi/verify-domain', async (req, res) => {
  try {
    const { userId, url, expectedToken } = req.body;
    
    if (!url || !expectedToken) {
      return res.status(400).json({ error: 'URL and expectedToken are required' });
    }
    
    // Parse URL to get origin
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const challengeUrl = `${parsedUrl.origin}/.well-known/cmail-challenge.txt`;
    
    // Fetch the challenge file
    let response;
    try {
      response = await fetch(challengeUrl, { 
        method: 'GET',
        timeout: 5000 
      });
    } catch {
      return res.json({ 
        verified: false, 
        error: 'Could not fetch challenge file. Make sure the file exists at ' + challengeUrl 
      });
    }
    
    if (!response.ok) {
      return res.json({ 
        verified: false, 
        error: `Challenge file not found (HTTP ${response.status}). Create it at /.well-known/cmail-challenge.txt` 
      });
    }
    
    const content = await response.text();
    const trimmedContent = content.trim();
    
    if (trimmedContent !== expectedToken.trim()) {
      return res.json({ 
        verified: false, 
        error: 'Token mismatch. File content does not match expected token.',
        received: trimmedContent,
        expected: expectedToken.trim()
      });
    }
    
    // Mark as verified
    if (!verifiedDomains.has(userId)) {
      verifiedDomains.set(userId, new Set());
    }
    verifiedDomains.get(userId).add(url);
    
    res.json({ verified: true, message: 'Domain verified successfully' });
  } catch (error) {
    console.error('Domain verification error:', error);
    res.status(500).json({ error: 'Failed to verify domain' });
  }
});

// Check if URL is verified
app.get('/api/devapi/verify-status/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { url } = req.query;
    
    const verified = verifiedDomains.has(userId) && verifiedDomains.get(userId).has(url);
    res.json({ verified });
  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Admin News - In-memory store for news items
const adminNews = new Map(); // userId (admin) -> Array of news items

// Admin verification helper - checks if user is playraofficial (admin)
const isAdminUser = async (userId) => {
  try {
    await connectDB();
    const user = await User.findById(userId).select('email username isAdmin');
    if (!user) return false;
    return user.username === 'playraofficial' || 
           user.email === 'playraofficial@c-mail.vercel.app' ||
           user.isAdmin === true;
  } catch {
    return false;
  }
};

// Get all news from admin
app.get('/api/news', (req, res) => {
  try {
    // Get all news from all admins, flattened
    const allNews = [];
    adminNews.forEach((newsItems, adminId) => {
      newsItems.forEach(news => {
        allNews.push({
          ...news,
          adminId
        });
      });
    });
    // Sort by createdAt descending
    allNews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(allNews);
  } catch (error) {
    console.error('Fetch news error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Get news for specific admin (admin only)
app.get('/api/news/:adminId', (req, res) => {
  try {
    const { adminId } = req.params;
    const news = adminNews.get(adminId) || [];
    res.json(news);
  } catch (error) {
    console.error('Fetch admin news error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Create news (admin only)
app.post('/api/news', async (req, res) => {
  try {
    const { adminId, title, content } = req.body;
    
    if (!adminId || !title || !content) {
      return res.status(400).json({ error: 'adminId, title, and content are required' });
    }
    
    // Verify admin status
    if (!isAdminUser(adminId)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }
    
    const newsItem = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!adminNews.has(adminId)) {
      adminNews.set(adminId, []);
    }
    adminNews.get(adminId).push(newsItem);
    
    res.status(201).json(newsItem);
  } catch (error) {
    console.error('Create news error:', error);
    res.status(500).json({ error: 'Failed to create news' });
  }
});

// Update news (admin only)
app.patch('/api/news/:newsId', async (req, res) => {
  try {
    const { newsId } = req.params;
    const { adminId, title, content } = req.body;
    
    if (!adminId) {
      return res.status(400).json({ error: 'adminId is required' });
    }
    
    // Verify admin status
    if (!isAdminUser(adminId)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }
    
    const newsItems = adminNews.get(adminId);
    if (!newsItems) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    const newsItem = newsItems.find(n => n.id === newsId);
    if (!newsItem) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    if (title) newsItem.title = title.trim();
    if (content) newsItem.content = content.trim();
    newsItem.updatedAt = new Date().toISOString();
    
    res.json(newsItem);
  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({ error: 'Failed to update news' });
  }
});

// Delete news (admin only)
app.delete('/api/news/:newsId', async (req, res) => {
  try {
    const { newsId } = req.params;
    const { adminId } = req.body;
    
    if (!adminId) {
      return res.status(400).json({ error: 'adminId is required' });
    }
    
    // Verify admin status
    if (!isAdminUser(adminId)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }
    
    const newsItems = adminNews.get(adminId);
    if (!newsItems) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    const filtered = newsItems.filter(n => n.id !== newsId);
    if (filtered.length === newsItems.length) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    adminNews.set(adminId, filtered);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

// ========== TRANSACTIONAL EMAIL API ==========

// Email logs store - tracks all emails sent via API
const emailLogs = new Map(); // clientId -> Array of email logs

// Rate limiting store - tracks daily sends per app
const rateLimitStore = new Map(); // clientId -> { count, date }

// Spam keywords to check
const spamKeywords = [
  'viagra', 'cialis', 'lottery', 'winner', 'million dollars', 'nigerian prince',
  'click here', 'act now', 'limited time', 'urgent', 'congratulations you won',
  'free money', 'make money fast', 'work from home', 'weight loss', 'credit card'
];

// Check if content contains spam
const containsSpam = (text) => {
  const lowerText = text.toLowerCase();
  return spamKeywords.some(keyword => lowerText.includes(keyword));
};

// Check rate limit for unverified apps
const checkRateLimit = (clientId, isVerified) => {
  if (isVerified) return { allowed: true };
  
  const today = new Date().toISOString().split('T')[0];
  const store = rateLimitStore.get(clientId);
  
  if (!store || store.date !== today) {
    rateLimitStore.set(clientId, { count: 1, date: today });
    return { allowed: true, remaining: 49 };
  }
  
  if (store.count >= 50) {
    return { allowed: false, error: 'Daily rate limit exceeded (50 emails/day for unverified apps)' };
  }
  
  store.count++;
  return { allowed: true, remaining: 50 - store.count };
};

// Generate branded email HTML
const generateBrandedEmail = (appName, appLogo, subject, body, category) => {
  const categoryColors = {
    verification: '#22d3ee',
    notification: '#50fa7b',
    promotion: '#ff5555',
    update: '#f1fa8c'
  };
  const color = categoryColors[category] || '#6272a4';
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 24px; display: flex; align-items: center; gap: 16px; }
    .app-logo { width: 40px; height: 40px; border-radius: 8px; background: ${color}; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; font-size: 18px; }
    .app-info { flex: 1; }
    .app-name { color: white; font-size: 18px; font-weight: 600; margin: 0; }
    .badge { display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.1); color: #8be9fd; font-size: 11px; padding: 4px 8px; border-radius: 100px; margin-top: 4px; }
    .content { padding: 32px; color: #333; line-height: 1.6; }
    .content h1 { font-size: 24px; margin: 0 0 16px 0; color: #1a1a2e; }
    .content p { margin: 0 0 16px 0; }
    .code-box { background: #f8f9fa; border: 2px dashed #6272a4; border-radius: 8px; padding: 20px; text-align: center; font-family: monospace; font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #1a1a2e; margin: 24px 0; }
    .footer { background: #f8f9fa; padding: 20px 32px; border-top: 1px solid #e5e5e5; text-align: center; }
    .footer-text { font-size: 13px; color: #666; margin: 0 0 8px 0; }
    .footer-link { color: #6272a4; text-decoration: none; font-weight: 500; }
    .footer-link:hover { text-decoration: underline; }
    .powered-by { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 12px; font-size: 12px; color: #999; }
    .cmail-icon { width: 16px; height: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="app-logo">${appName?.[0]?.toUpperCase() || 'A'}</div>
      <div class="app-info">
        <p class="app-name">${appName || 'App'}</p>
        <span class="badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Verified via C-mail
        </span>
      </div>
    </div>
    <div class="content">
      ${body}
    </div>
    <div class="footer">
      <p class="footer-text">This email was sent via <strong>C-mail</strong> for ${appName || 'an external application'}.</p>
      <p class="footer-text">Don't recognize this? <a href="https://c-mail.vercel.app/settings/connected-apps" class="footer-link">Manage your connected apps</a></p>
      <div class="powered-by">
        <svg class="cmail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        Powered by C-mail Delivery Engine
      </div>
    </div>
  </div>
</body>
</html>`;
};

// Transactional Email API - POST /api/v1/send
app.post('/api/v1/send', async (req, res) => {
  try {
    const { 
      to,           // recipient email address (user's c-mail address)
      subject,      // email subject
      body,         // email body (HTML supported)
      appName,      // sender app name (e.g., "Vintag")
      appLogo,      // optional logo URL
      category,     // 'verification', 'notification', 'promotion', 'update'
      apiKey        // the app's API key
    } = req.body;
    
    // Validate required fields
    if (!to || !subject || !body || !apiKey) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, body, apiKey' 
      });
    }
    
    // Verify API key and get app info from MongoDB
    const apiKeyDoc = await ApiKey.findOne({ apiKey });
    if (!apiKeyDoc) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Check if app is verified (has verified redirect URLs)
    const isVerified = apiKeyDoc.redirectUrls && apiKeyDoc.redirectUrls.length > 0;
    
    // Check rate limits for unverified apps
    const rateCheck = checkRateLimit(apiKey, isVerified);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: rateCheck.error });
    }
    
    // Check for spam content
    if (containsSpam(subject + ' ' + body)) {
      return res.status(400).json({ 
        error: 'Email contains potentially spammy content',
        flagged: true 
      });
    }
    
    // Extract username from email (remove @c-mail.vercel.app)
    const toUsername = to.replace('@c-mail.vercel.app', '');
    
    // Find recipient user
    const recipient = await User.findOne({ username: toUsername });
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    
    // Generate branded email HTML
    const brandedBody = generateBrandedEmail(
      appName || 'External App',
      appLogo,
      subject,
      body,
      category || 'notification'
    );
    
    // Create email in database
    const email = new Email({
      sender: apiKeyDoc.userId, // The app owner's ID as sender
      senderName: appName || 'External App',
      senderUsername: 'system', // Special username for system emails
      recipient: recipient._id,
      recipientUsername: toUsername,
      subject: subject,
      body: brandedBody,
      isTransactional: true,
      appName: appName,
      category: category || 'notification',
      isVerifiedSender: isVerified,
      folder: 'inbox',
      read: false
    });
    
    await email.save();
    
    // Log the email
    const logEntry = {
      id: email._id.toString(),
      to: toUsername,
      subject,
      category: category || 'notification',
      sentAt: new Date().toISOString(),
      status: 'delivered',
      isVerified
    };
    
    if (!emailLogs.has(apiKey)) {
      emailLogs.set(apiKey, []);
    }
    emailLogs.get(apiKey).unshift(logEntry);
    
    // Keep only last 100 logs per app
    if (emailLogs.get(apiKey).length > 100) {
      emailLogs.set(apiKey, emailLogs.get(apiKey).slice(0, 100));
    }
    
    res.status(201).json({
      success: true,
      messageId: email._id.toString(),
      status: 'delivered',
      rateLimit: {
        remaining: rateCheck.remaining,
        limit: isVerified ? 'unlimited' : 50
      }
    });
    
  } catch (error) {
    console.error('Transactional email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Get email logs for an app (developer endpoint)
app.get('/api/devapi/email-logs/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { apiKey } = req.query;
    
    // Verify the API key belongs to this user
    const userApiKeys = await ApiKey.find({ userId });
    const userApiKeyStrings = userApiKeys.map(k => k.apiKey);
    
    if (apiKey && !userApiKeyStrings.includes(apiKey)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Return logs for specific key or all keys
    const keys = apiKey ? [apiKey] : userApiKeyStrings;
    const logs = [];
    
    for (const key of keys) {
      const keyLogs = emailLogs.get(key) || [];
      const keyData = await ApiKey.findOne({ apiKey: key });
      keyLogs.forEach(log => {
        logs.push({
          ...log,
          appName: keyData?.appKey || 'Unknown App'
        });
      });
    }
    
    // Sort by date descending
    logs.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
    
    res.json(logs.slice(0, 50));
  } catch (error) {
    console.error('Get email logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get user data
app.get('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await connectDB();
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile settings
app.patch('/api/user/profile', async (req, res) => {
  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ 
        error: 'Database not configured',
        details: 'MONGODB_URI environment variable is not set'
      });
    }
    
    // Lazy connect to MongoDB with timeout
    await Promise.race([
      connectDB(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 6000)
      )
    ]);
    
    const { userId, firstName, secondName, number, profileUrl } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Build update object - only include fields that are provided
    const updateFields = {};
    if (firstName !== undefined) updateFields.firstName = firstName;
    if (secondName !== undefined) updateFields.secondName = secondName;
    if (number !== undefined) updateFields.number = number;
    if (profileUrl !== undefined) updateFields.profileUrl = profileUrl;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT endpoint for profile (used by ProfileSetup.jsx)
app.put('/api/user/profile', async (req, res) => {
  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ 
        error: 'Database not configured',
        details: 'MONGODB_URI environment variable is not set'
      });
    }
    
    // Lazy connect to MongoDB with timeout
    await Promise.race([
      connectDB(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 6000)
      )
    ]);
    
    const { userId, profileUrl } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { profileUrl: profileUrl || '' } },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Assistant endpoint with Groq - streaming for token limit handling
// Disabled - Groq not in use
app.post('/api/ai/chat', async (req, res) => {
  try {
    return res.status(503).json({ error: 'AI assistant is currently disabled' });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'AI assistant temporarily unavailable', details: error.message });
  }
});

// AI Action executor - search contacts
app.post('/api/ai/search-contacts', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    await connectDB();
    
    // Search users by name or email (case-insensitive)
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { secondName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } }
      ]
    }).select('firstName secondName email username profileUrl').limit(10);

    res.json({ 
      success: true, 
      contacts: users.map(u => ({
        name: `${u.firstName} ${u.secondName}`,
        email: u.email,
        username: u.username,
        profileUrl: u.profileUrl
      }))
    });
  } catch (error) {
    console.error('Search contacts error:', error);
    res.status(500).json({ error: 'Failed to search contacts' });
  }
});

// AI Action executor - send email
app.post('/api/ai/send-email', async (req, res) => {
  try {
    const { to, subject, body, fromUserId, links } = req.body;
    
    if (!to || !fromUserId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await connectDB();
    
    // Find recipient by email or username
    const recipient = await User.findOne({
      $or: [
        { email: to },
        { username: to.replace('@c-mail.vercel.app', '').replace('@', '') }
      ]
    });
    
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Find sender
    const sender = await User.findById(fromUserId);
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    const senderName = `${sender.firstName} ${sender.secondName}`;
    const recipientName = `${recipient.firstName} ${recipient.secondName}`;

    // Create sent copy for sender
    const sentEmail = new Email({
      sender: sender._id,
      senderUsername: sender.username,
      senderName: senderName,
      recipient: recipient._id,
      recipientUsername: recipient.username,
      subject: subject || 'No Subject',
      body: body || '',
      links: links || [],
      folder: 'sent',
      read: true,
      starred: false
    });

    await sentEmail.save();

    // Create inbox copy for recipient
    const inboxEmail = new Email({
      sender: sender._id,
      senderUsername: sender.username,
      senderName: senderName,
      recipient: recipient._id,
      recipientUsername: recipient.username,
      subject: subject || 'No Subject',
      body: body || '',
      links: links || [],
      folder: 'inbox',
      read: false,
      starred: false
    });

    await inboxEmail.save();

    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      email: {
        to: recipient.email,
        toName: recipientName,
        subject: subject || 'No Subject'
      }
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// AI Action executor - get emails
app.post('/api/ai/get-emails', async (req, res) => {
  try {
    const { userId, folder } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    await connectDB();
    
    const emails = await Email.find({
      $or: [
        { senderId: userId, folder: 'sent' },
        { recipientId: userId, folder: folder || 'inbox' }
      ]
    }).sort({ createdAt: -1 }).limit(20);

    res.json({ 
      success: true, 
      emails: emails.map(e => ({
        id: e._id,
        from: e.from,
        fromName: e.fromName,
        to: e.to,
        subject: e.subject,
        preview: e.body?.substring(0, 100) + '...',
        date: e.createdAt,
        read: e.read
      }))
    });
  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({ error: 'Failed to get emails' });
  }
});

// Non-streaming fallback for simple queries
// Disabled - Groq not in use
app.post('/api/ai/quick', async (req, res) => {
  try {
    return res.status(503).json({ error: 'AI assistant is currently disabled' });
  } catch (error) {
    console.error('AI quick error:', error);
    res.status(500).json({ error: 'AI assistant temporarily unavailable', details: error.message });
  }
});

// AI Chat History - Get all chats for a user
app.get('/api/ai/chats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await connectDB();
    
    const chats = await AIChat.find({ userId })
      .sort({ updatedAt: -1 })
      .select('title createdAt updatedAt messages');
    
    res.json({ 
      success: true, 
      chats: chats.map(chat => ({
        id: chat._id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: chat.messages.length,
        preview: chat.messages[chat.messages.length - 1]?.content?.substring(0, 50) || ''
      }))
    });
  } catch (error) {
    console.error('Get AI chats error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// AI Chat History - Get single chat
app.get('/api/ai/chats/:userId/:chatId', async (req, res) => {
  try {
    const { userId, chatId } = req.params;
    
    await connectDB();
    
    const chat = await AIChat.findOne({ _id: chatId, userId });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json({ 
      success: true, 
      chat: {
        id: chat._id,
        title: chat.title,
        messages: chat.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });
  } catch (error) {
    console.error('Get AI chat error:', error);
    res.status(500).json({ error: 'Failed to get chat' });
  }
});

// AI Chat History - Create new chat
app.post('/api/ai/chats', async (req, res) => {
  try {
    const { userId, title, messages } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    await connectDB();
    
    const chat = new AIChat({
      userId,
      title: title || 'New Chat',
      messages: messages || []
    });
    
    await chat.save();
    
    res.json({ 
      success: true, 
      chat: {
        id: chat._id,
        title: chat.title,
        messages: chat.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });
  } catch (error) {
    console.error('Create AI chat error:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// AI Chat History - Update chat (add/update messages)
app.put('/api/ai/chats/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId, title, messages } = req.body;
    
    await connectDB();
    
    const updateData = {};
    if (title) updateData.title = title;
    if (messages) updateData.messages = messages;
    
    const chat = await AIChat.findOneAndUpdate(
      { _id: chatId, userId },
      { $set: updateData },
      { new: true }
    );
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json({ 
      success: true, 
      chat: {
        id: chat._id,
        title: chat.title,
        messages: chat.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });
  } catch (error) {
    console.error('Update AI chat error:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
});

// AI Chat History - Delete chat
app.delete('/api/ai/chats/:userId/:chatId', async (req, res) => {
  try {
    const { userId, chatId } = req.params;
    
    await connectDB();
    
    const chat = await AIChat.findOneAndDelete({ _id: chatId, userId });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete AI chat error:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// AI Gist - Get all gists (admin only)
app.get('/api/ai-gists', async (req, res) => {
  try {
    const { admin } = req.query;
    
    // Only allow admin to access
    if (admin !== 'true') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await connectDB();
    
    const gists = await AIGist.find({})
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ 
      success: true, 
      gists: gists.map(g => ({
        id: g._id,
        type: g.type,
        title: g.title,
        content: g.content,
        author: g.author,
        priority: g.priority,
        status: g.status,
        createdAt: g.createdAt
      }))
    });
  } catch (error) {
    console.error('Get AI gists error:', error);
    res.status(500).json({ error: 'Failed to get AI gists' });
  }
});

// AI Gist - Create new gist (admin posts or AI posts complaints)
app.post('/api/ai-gists', async (req, res) => {
  try {
    const { type, title, content, author, authorId, priority, isPublic } = req.body;
    
    if (!type || !title || !content || !author) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    await connectDB();
    
    const gist = new AIGist({
      type,
      title,
      content,
      author,
      authorId,
      priority: priority || 'medium',
      isPublic: isPublic !== undefined ? isPublic : true
    });
    
    await gist.save();
    
    res.json({ 
      success: true, 
      gist: {
        id: gist._id,
        type: gist.type,
        title: gist.title,
        content: gist.content,
        author: gist.author,
        priority: gist.priority,
        status: gist.status,
        createdAt: gist.createdAt
      }
    });
  } catch (error) {
    console.error('Create AI gist error:', error);
    res.status(500).json({ error: 'Failed to create AI gist' });
  }
});

// AI Gist - Update gist status (admin only)
app.put('/api/ai-gists/:gistId', async (req, res) => {
  try {
    const { gistId } = req.params;
    const { status, priority, isPublic } = req.body;
    
    await connectDB();
    
    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    
    const gist = await AIGist.findByIdAndUpdate(
      gistId,
      { $set: updateData },
      { new: true }
    );
    
    if (!gist) {
      return res.status(404).json({ error: 'Gist not found' });
    }
    
    res.json({ 
      success: true, 
      gist: {
        id: gist._id,
        type: gist.type,
        title: gist.title,
        content: gist.content,
        author: gist.author,
        priority: gist.priority,
        status: gist.status,
        createdAt: gist.createdAt
      }
    });
  } catch (error) {
    console.error('Update AI gist error:', error);
    res.status(500).json({ error: 'Failed to update AI gist' });
  }
});

// AI Gist - Delete gist (admin only)
app.delete('/api/ai-gists/:gistId', async (req, res) => {
  try {
    const { gistId } = req.params;
    
    await connectDB();
    
    const gist = await AIGist.findByIdAndDelete(gistId);
    
    if (!gist) {
      return res.status(404).json({ error: 'Gist not found' });
    }
    
    res.json({ success: true, message: 'AI Gist deleted successfully' });
  } catch (error) {
    console.error('Delete AI gist error:', error);
    res.status(500).json({ error: 'Failed to delete AI gist' });
  }
});

// Cron job endpoint to keep MongoDB active
app.get('/api/cron/keep-alive', async (req, res) => {
  try {
    // Verify CRON_SECRET for security
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).end('Unauthorized');
    }

    await connectDB();
    // Perform a simple query to keep the connection active
    await User.countDocuments();
    res.json({ 
      success: true, 
      message: 'MongoDB keep-alive successful',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Keep-alive error:', error);
    res.status(500).json({ error: 'Keep-alive failed' });
  }
});

// Catch-all for debugging
app.all('*', (req, res) => {
  console.log(`404 - ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not found', method: req.method, url: req.url });
});

// Only start server locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;
