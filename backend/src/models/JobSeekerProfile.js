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
  full_name: String,
  bio: String,
  location: String,
  phone: String,
  address: String,
  date_of_birth: Date,
  gender: String,
  nationality: String,
  linkedin_url: String,
  portfolio_url: String,
  github_url: String,
  skills: [String],
  skillDetails: [{
    skill_name: String,
    proficiency_level: String,
    endorsement_count: {
      type: Number,
      default: 0
    }
  }],
  experience: [{
    job_title: String,
    title: String,
    employment_type: String,
    company: String,
    start_date: Date,
    end_date: Date,
    currently_working: Boolean,
    startDate: Date,
    endDate: Date,
    description: String
  }],
  education: [{
    school: String,
    degree: String,
    field: String,
    field_of_study: String,
    grade: String,
    start_date: Date,
    end_date: Date,
    graduation_year: Number,
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
