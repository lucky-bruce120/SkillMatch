import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  difficulty_level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced']
  },
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

courseSchema.pre('save', function () {
  this.updated = Date.now();
});

export default mongoose.model('Course', courseSchema);