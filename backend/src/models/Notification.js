import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['application_response', 'new_job_match', 'course_available', 'message'],
    default: 'message'
  },
  title: String,
  message: String,
  related_id: mongoose.Schema.Types.ObjectId,
  isRead: {
    type: Boolean,
    default: false
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

notificationSchema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

export default mongoose.model('Notification', notificationSchema);