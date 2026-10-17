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

// A user can only bookmark a course once. Two concurrent requests could
// otherwise both pass the findOne check and insert a duplicate.
bookmarkedCourseSchema.index({ user_id: 1, course_id: 1 }, { unique: true });

export default mongoose.model('BookmarkedCourse', bookmarkedCourseSchema);