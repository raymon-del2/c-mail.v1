import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import process from 'process';
import User from './models/User.js';
import Email from './models/Email.js';
import ApiKey from './models/ApiKey.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.post('/api/signup', async (req, res) => {
  try {
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
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({ 
      message: 'Login successful', 
      user: userResponse 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.put('/api/profile', async (req, res) => {
  try {
    const { userId, profileUrl } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { profileUrl },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      message: 'Profile updated successfully', 
      user 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
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
    await Email.findByIdAndDelete(emailId);
    res.json({ success: true, message: 'Email deleted' });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

// Mark email as read
app.patch('/api/emails/:emailId/read', async (req, res) => {
  try {
    const { emailId } = req.params;
    const email = await Email.findByIdAndUpdate(
      emailId,
      { read: true },
      { new: true }
    );
    res.json({ success: true, email });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Reply to email
app.post('/api/emails/reply', async (req, res) => {
  try {
    const { senderId, recipientId, parentEmailId, subject, body, links, threadId } = req.body;
    
    console.log('Reply request:', { senderId, recipientId, parentEmailId, threadId });
    
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
    
    // Verify code exists and is valid
    const codeData = authCodes.get(code);
    if (!codeData) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }
    
    if (codeData.used) {
      return res.status(400).json({ error: 'Code already used' });
    }
    
    // Check expiration (5 minutes)
    if (Date.now() - codeData.createdAt > 5 * 60 * 1000) {
      authCodes.delete(code);
      return res.status(400).json({ error: 'Code expired' });
    }
    
    // Verify client
    if (codeData.clientId !== clientId) {
      return res.status(400).json({ error: 'Client ID mismatch' });
    }
    
    // Get user data
    const user = await User.findById(codeData.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Mark code as used
    codeData.used = true;
    
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
    
    res.json({
      access_token: 'cmail_token_' + Math.random().toString(36).substring(2),
      token_type: 'Bearer',
      expires_in: 3600,
      id_token: token
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
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
    
    const consents = userConsents.get(userId) || [];
    const filtered = consents.filter(c => c.clientId !== clientId);
    userConsents.set(userId, filtered);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Revoke access error:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
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
    
    // Find and update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return updated user data without password
    const userResponse = updatedUser.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Only start server locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;
