import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  company: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  salary: {
    type: Number
  },
  salary_min: {
    type: Number
  },
  salary_max: {
    type: Number
  },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship']
  },
  remoteType: {
    type: String,
    enum: ['remote', 'hybrid', 'on-site']
  },
  required_skills: [{
    type: String
  }],
  experience_level: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'active'
  },
  employer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
});

jobSchema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

export default mongoose.model('Job', jobSchema);
