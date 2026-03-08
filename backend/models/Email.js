import mongoose from 'mongoose';

const emailSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderUsername: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientUsername: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    default: 'No Subject'
  },
  body: {
    type: String,
    required: true
  },
  links: [{
    text: String,
    url: String
  }],
  folder: {
    type: String,
    enum: ['inbox', 'sent', 'drafts'],
    default: 'inbox'
  },
  read: {
    type: Boolean,
    default: false
  },
  // Threaded reply fields
  parentEmailId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email',
    default: null
  },
  isReply: {
    type: Boolean,
    default: false
  },
  replyCount: {
    type: Number,
    default: 0
  },
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  // Transactional email fields (for external apps)
  isTransactional: {
    type: Boolean,
    default: false
  },
  appName: {
    type: String,
    default: null
  },
  category: {
    type: String,
    enum: ['verification', 'notification', 'promotion', 'update', null],
    default: null
  },
  isVerifiedSender: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Email = mongoose.model('Email', emailSchema);
export default Email;
