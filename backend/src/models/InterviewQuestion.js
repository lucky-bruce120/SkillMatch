import mongoose from 'mongoose';

const interviewQuestionSchema = new mongoose.Schema({
  job_role: String,
  question: String,
  sample_answer: String,
  difficulty: String,
  created: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('InterviewQuestion', interviewQuestionSchema);