import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  application_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    index: true,
  },
  job_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true,
  },
  employer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  job_seeker_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['phone', 'video', 'in-person', 'other'],
    default: 'video',
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },
  duration_minutes: {
    type: Number,
    min: 5,
    default: 30,
  },
  location: {
    type: String,
    trim: true,
  },
  meeting_link: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'sent',
  },
  feedback: {
    type: String,
    trim: true,
  },
  sent_at: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

interviewSchema.pre('save', function () {
  this.updated = Date.now();
});

export default mongoose.model('Interview', interviewSchema);
