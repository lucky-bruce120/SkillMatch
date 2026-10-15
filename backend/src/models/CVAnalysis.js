import mongoose from 'mongoose';

const cvAnalysisSchema = new mongoose.Schema({
  job_seeker_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cv_file: String,
  analysis_result: mongoose.Schema.Types.Mixed,
  cv_score: Number,
  extracted_skills: [String],
  missing_skills: [String],
  suggestions: [String],
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
});

cvAnalysisSchema.pre('save', function () {
  this.updated = Date.now();
});

export default mongoose.model('CVAnalysis', cvAnalysisSchema);