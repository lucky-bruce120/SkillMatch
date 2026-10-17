import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  // In production (Render, Vercel, etc.) there is no local MongoDB, so silently
  // falling back to localhost produces a confusing ECONNREFUSED. Fail loudly
  // with an actionable message instead.
  if (!uri) {
    console.error(
      'MONGODB_URI is not set.\n' +
      'Set it as an environment variable (Render Dashboard > Environment), e.g.\n' +
      '  MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/skillmatch?retryWrites=true&w=majority\n' +
      'For local development, add MONGODB_URI=mongodb://127.0.0.1:27017/skillmatch to backend/.env'
    );
    process.exit(1);
  }

  mongoose.connection.on('connected', () => {
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      // NOTE: do not force `family: 4`. MongoDB Atlas provisions IPv6-only
      // clusters for new projects, and pinning IPv4 makes the driver unable to
      // reach them. Let the driver negotiate IPv4/IPv6 automatically.
      autoIndex: process.env.NODE_ENV !== 'production',
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;