import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: String,
  category: { type: String, trim: true },

  // Free-text hours, e.g. "6h 30m". Stored loosely because providers are
  // inconsistent about how they express duration.
  duration: String,

  // Rating on the provider's own scale, normalised to 0-5 where known.
  rating: { type: Number, min: 0, max: 5 },

  // Concrete skills the course teaches. Used for relevance scoring, so it is
  // far more reliable than substring-matching the description.
  skills: [{ type: String, trim: true }],

  difficulty_level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },

  // Legacy field kept for existing documents; ranking is now computed at
  // request time from the requested skill gaps.
  relevance_score: Number,

  provider: String,
  url: String,

  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
});

// Supports the "show me everything at this level" browse case.
courseSchema.index({ category: 1, difficulty_level: 1 });

courseSchema.pre('save', function pre() {
  this.updated = Date.now();
});

export default mongoose.model('Course', courseSchema);
