import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  jwt: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  lastUsed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
tokenSchema.index({ userId: 1, createdAt: -1 });
tokenSchema.index({ jwt: 1, userId: 1 });
tokenSchema.index({ userId: 1, expiresAt: 1 });

// Create JWT token (matches server.js usage)
tokenSchema.statics.createJWT = async function(tokenRecord) {
  try {
    const tokenDoc = new this({
      userId: tokenRecord.userId,
      name: tokenRecord.name,
      jwt: tokenRecord.jwt,
      createdAt: tokenRecord.createdAt,
      expiresAt: tokenRecord.expiresAt,
      lastUsed: tokenRecord.lastUsed
    });
    
    const savedToken = await tokenDoc.save();
    console.log(`JWT token saved: ${tokenRecord.name} for user: ${tokenRecord.userId}`);
    return savedToken;
  } catch (error) {
    console.error('JWT token creation error:', error);
    throw new Error('Failed to create JWT token');
  }
};

// Find token by JWT string and userId (for authentication)
tokenSchema.statics.findByJWT = async function(jwt, userId) {
  try {
    return await this.findOne({
      jwt,
      userId,
      expiresAt: { $gt: new Date() }
    });
  } catch (error) {
    console.error('Find by JWT error:', error);
    return null;
  }
};

// Update last used timestamp (matches server.js usage)
tokenSchema.statics.updateLastUsed = async function(tokenId) {
  try {
    await this.updateOne(
      { _id: tokenId },
      { lastUsed: new Date() }
    );
  } catch (error) {
    console.error('Update last used error:', error);
  }
};

// Find specific token by ID and user ID (matches server.js usage)
tokenSchema.statics.findById = async function(tokenId, userId) {
  try {
    return await this.findOne({ 
      _id: tokenId, 
      userId
    });
  } catch (error) {
    console.error('Find by ID error:', error);
    return null;
  }
};

// Clean up expired tokens
tokenSchema.statics.cleanExpired = async function() {
  try {
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    console.log(`Cleaned up ${result.deletedCount} expired tokens`);
    return result.deletedCount;
  } catch (error) {
    console.error('Clean expired tokens error:', error);
    return 0;
  }
};

// Instance method to check if token is expired
tokenSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

// Instance method to get days until expiry
tokenSchema.methods.daysUntilExpiry = function() {
  const now = new Date();
  const diffTime = this.expiresAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Pre-save middleware
tokenSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`Creating JWT token: ${this.name} for user: ${this.userId}`);
  }
  next();
});

const Token = mongoose.model('Token', tokenSchema);

export default Token;