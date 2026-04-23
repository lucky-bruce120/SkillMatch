import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['job_seeker', 'employer', 'admin'],
    required: true
  },
  account_status: {
    type: String,
    enum: ['active', 'deactivated'],
    default: 'active'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCode: String,
  passwordResetToken: String,
  passwordResetExpiry: Date,
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

export default mongoose.model('User', userSchema);
