import mongoose from 'mongoose';

const jobSeekerProfileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  firstName: String,
  lastName: String,
  phone: String,
  address: String,
  skills: [String],
  experience: [{
    title: String,
    company: String,
    startDate: Date,
    endDate: Date,
    description: String
  }],
  education: [{
    degree: String,
    institution: String,
    graduationYear: Number
  }],
  cv: String, // file path or URL
  picture: String, // file path or URL
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
});

jobSeekerProfileSchema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

export default mongoose.model('JobSeekerProfile', jobSeekerProfileSchema);