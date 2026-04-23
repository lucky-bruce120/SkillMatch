import mongoose from 'mongoose';

const bookmarkedCourseSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  created: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('BookmarkedCourse', bookmarkedCourseSchema);