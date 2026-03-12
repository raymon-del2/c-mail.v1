import mongoose from 'mongoose';
import crypto from 'crypto';

// Schema for OTP and Magic Link verifications
const verificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['otp', 'magic_link'],
    required: true
  },
  appId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiKey',
    required: true
  },
  appName: {
    type: String,
    required: true
  },
  redirectUrl: {
    type: String,
    default: null
  },
  verified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Auto-delete after 10 minutes
  }
});

// Generate random 6-digit OTP
verificationSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate secure random token for magic links
verificationSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Hash code before saving
verificationSchema.pre('save', function(next) {
  if (this.isModified('code')) {
    this.code = crypto.createHash('sha256').update(this.code).digest('hex');
  }
  next();
});

// Method to verify code
verificationSchema.methods.verifyCode = function(inputCode) {
  const hashedInput = crypto.createHash('sha256').update(inputCode).digest('hex');
  return this.code === hashedInput;
};

const Verification = mongoose.model('Verification', verificationSchema);
export default Verification;
