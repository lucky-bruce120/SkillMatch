import mongoose from 'mongoose';

const employerProfileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  company_name: String,
  company_description: String,
  company_website: String,
  company_size: String,
  industry: String,
  location: String,
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
});

employerProfileSchema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

export default mongoose.model('EmployerProfile', employerProfileSchema);