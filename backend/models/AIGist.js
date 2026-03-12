import mongoose from 'mongoose';

const aiGistSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['feature', 'complaint', 'update', 'announcement'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String, // 'admin' or username who complained
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'dismissed'],
    default: 'pending'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const AIGist = mongoose.model('AIGist', aiGistSchema);
export default AIGist;
