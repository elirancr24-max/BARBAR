// Set required env vars BEFORE any module that reads `process.env` is imported.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = process.env.REDIS_URL || 'memory://test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test_access_secret_at_least_16_chars_long';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_at_least_16_chars_long';
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
process.env.BUSINESS_NAME = process.env.BUSINESS_NAME || 'TestBarber';
process.env.BUSINESS_PHONE = process.env.BUSINESS_PHONE || '972500000000';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
