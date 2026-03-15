import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  clientId: { 
    type: String, 
    required: true,
    index: true
  }, // API key (client_id)
  token: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: '90d' // Auto-delete after 90 days of inactivity
  },
  lastUsed: { 
    type: Date, 
    default: Date.now 
  },
  isRevoked: { 
    type: Boolean, 
    default: false 
  },
  revokedAt: {
    type: Date,
    default: null
  },
  revokedReason: {
    type: String,
    default: null
  }
});

// Compound index for efficient lookups
refreshTokenSchema.index({ userId: 1, clientId: 1 });

// Method to revoke token
refreshTokenSchema.methods.revoke = function(reason = 'User revoked access') {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  return this.save();
};

// Static method to find valid token
refreshTokenSchema.statics.findValidToken = async function(token) {
  return this.findOne({ 
    token, 
    isRevoked: false,
    $or: [
      { expires: { $exists: false } },
      { expires: { $gt: new Date() } }
    ]
  });
};

// Static method to revoke all tokens for a user-client pair
refreshTokenSchema.statics.revokeAllForUserClient = async function(userId, clientId, reason = 'User revoked access') {
  return this.updateMany(
    { userId, clientId, isRevoked: false },
    { 
      isRevoked: true, 
      revokedAt: new Date(), 
      revokedReason: reason 
    }
  );
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
