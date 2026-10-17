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

  /**
   * What the candidate is looking for. Skills alone cannot rank roles well, so
   * preferences are stored alongside them and used to annotate recommendations.
   */
  preferences: {
    // Free-text role titles, e.g. "Frontend Engineer", "React Developer".
    desired_roles: { type: [String], default: [] },
    // Free-text locations, e.g. "London", "Remote".
    preferred_locations: { type: [String], default: [] },
    // Preferred working arrangement: remote / hybrid / on-site / any.
    work_arrangement: { type: String, default: 'any' },
    // Preferred employment type: full-time / part-time / contract / internship / any.
    job_type: { type: String, default: 'any' },
    experience_level: { type: String, default: 'any' },
    // Annual salary expectation, used to flag roles that pay under it.
    expected_salary_min: { type: Number, default: null },
    expected_salary_max: { type: Number, default: null },
    // Earliest start date, e.g. "Immediately", "1 month", "3 months".
    availability: { type: String, default: '' },
    open_to_relocate: { type: Boolean, default: false },
    // Drives the "profile is visible to employers" toggle.
    profile_visible: { type: Boolean, default: true },
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

jobSeekerProfileSchema.pre('save', function () {
  this.updated = Date.now();
});

export default mongoose.model('JobSeekerProfile', jobSeekerProfileSchema);
