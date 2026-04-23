import logger from '../utils/logger.js';

export const errorMiddleware = (err, req, res, next) => {
  logger.error('Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  
  res.status(status).json({
    error: message,
    status
  });
};

export default errorMiddleware;