import mongoose from 'mongoose';

const interviewTipSchema = new mongoose.Schema({
  job_role: String,
  category: String,
  tip_text: String,
  created: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('InterviewTip', interviewTipSchema);