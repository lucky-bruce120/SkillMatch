import mongoose from 'mongoose';

/**
 * Tracks which items the user has ticked off in the interview prep checklist,
 * per role. Stored server-side so the checklist survives a reload or a change
 * of device, and so employers see nothing about it (it is purely personal).
 */
const interviewPrepProgressSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  job_role: {
    type: String,
    required: true,
    trim: true
  },
  completed: {
    type: [String],
    default: []
  },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

// One progress record per user per role.
interviewPrepProgressSchema.index({ user_id: 1, job_role: 1 }, { unique: true });

interviewPrepProgressSchema.pre('save', function save() {
  this.updated = Date.now();
});

export default mongoose.model('InterviewPrepProgress', interviewPrepProgressSchema);
