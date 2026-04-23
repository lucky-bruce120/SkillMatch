import mongoose from 'mongoose';

const savedJobSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  job_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  created: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('SavedJob', savedJobSchema);