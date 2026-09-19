# 🔧 Complete Environment Configuration Guide

## 📍 Overview

This guide covers all environment variables available for SPVB Downloader, including configurations for storage solutions like Cloudinary, MongoDB, AWS S3, and more.

---

## 📋 Table of Contents

1. [Server Settings](#server-settings)
2. [Security Settings](#security-settings)
3. [Database Configuration](#database-configuration)
4. [Storage Solutions](#storage-solutions)
5. [External Services](#external-services)
6. [File Management](#file-management)
7. [Advanced Settings](#advanced-settings)

---

## 🖥️ Server Settings

### PORT
- **Default**: `1406`
- **Type**: Number
- **Description**: Server port for the backend API
- **Example**: `PORT=1406`

### NODE_ENV
- **Default**: `development`
- **Type**: String
- **Options**: `development`, `production`, `staging`
- **Description**: Environment mode
- **Example**: `NODE_ENV=production`

### LOG_LEVEL
- **Default**: `debug`
- **Type**: String
- **Options**: `debug`, `info`, `warn`, `error`
- **Description**: Logging verbosity level
- **Example**: `LOG_LEVEL=info`

---

## 🔒 Security Settings

### JWT_SECRET
- **Type**: String
- **Description**: Secret key for JWT token signing
- **Length**: Minimum 32 characters recommended
- **Example**: `JWT_SECRET=your-super-secret-key-at-least-32-chars-long`

### CORS_ORIGIN
- **Default**: `http://localhost:1404`
- **Type**: String
- **Description**: Allowed origin for CORS requests
- **Example**: `CORS_ORIGIN=http://localhost:1404`

### ALLOWED_ORIGINS
- **Type**: String (comma-separated)
- **Description**: Multiple allowed origins for CORS
- **Example**: `ALLOWED_ORIGINS=http://localhost:1404,https://example.com`

### CORS_CREDENTIALS
- **Default**: `true`
- **Type**: Boolean
- **Description**: Enable/disable credentials in CORS requests
- **Example**: `CORS_CREDENTIALS=true`

### SESSION_TIMEOUT
- **Default**: `1800000` (30 minutes in milliseconds)
- **Type**: Number
- **Description**: Session expiration time in milliseconds
- **Calculation**: Minutes × 60 × 1000
- **Example**: `SESSION_TIMEOUT=1800000` (30 min)

---

## 🗄️ Database Configuration

### MongoDB (Recommended)

#### MONGODB_URI
- **Type**: String
- **Description**: MongoDB connection string
- **Local Format**: `mongodb://localhost:27017/dbname`
- **Cloud Format**: `mongodb+srv://username:password@cluster.mongodb.net/dbname`

**Example - Local:**
```env
MONGODB_URI=mongodb://localhost:27017/spvb
```

**Example - MongoDB Atlas (Cloud):**
```env
MONGODB_URI=mongodb+srv://user:pass@cluster0.mongodb.net/spvb?retryWrites=true&w=majority
```

#### MONGODB_DB_NAME
- **Default**: `spvb`
- **Type**: String
- **Description**: Database name
- **Example**: `MONGODB_DB_NAME=spvb`

**How to Get MongoDB:**

1. **Local MongoDB**:
   ```bash
   # Install MongoDB
   brew install mongodb-community  # macOS
   sudo apt-get install mongodb    # Linux
   
   # Start MongoDB
   mongod
   ```

2. **MongoDB Atlas (Cloud)**:
   - Go to: https://www.mongodb.com/cloud/atlas
   - Create free account
   - Create cluster
   - Get connection string
   - Copy to MONGODB_URI

**Collections Created Automatically:**
- `games` - Game listings
- `sessions` - User sessions
- `downloads` - Download history
- `users` - User data
- `stats` - Analytics data

---

## ☁️ Storage Solutions

### Cloudinary (Image & Video Storage)

#### CLOUDINARY_URL
- **Type**: String
- **Format**: `cloudinary://api_key:api_secret@cloud_name`
- **Description**: Complete Cloudinary connection string

**Example:**
```env
CLOUDINARY_URL=cloudinary://123456789012345:abcDEFghiJKLmnoPQRstuvWXYZ@mycloud
```

#### Individual Settings
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcDEFghiJKLmnoPQRstuvWXYZ
CLOUDINARY_FOLDER=spvb/downloads
```

**How to Get Cloudinary:**

1. Go to: https://cloudinary.com
2. Sign up (free tier: 25GB storage)
3. Go to Dashboard
4. Copy credentials
5. Add to .env

**Cloudinary Features:**
- ✓ Automatic image optimization
- ✓ Video delivery & streaming
- ✓ CDN distribution
- ✓ Automatic cleanup
- ✓ Bandwidth: 25GB/month (free)

---

### AWS S3 (Alternative Storage)

#### AWS_ACCESS_KEY_ID
- **Type**: String
- **Description**: AWS access key ID

#### AWS_SECRET_ACCESS_KEY
- **Type**: String
- **Description**: AWS secret access key

#### AWS_REGION
- **Default**: `us-east-1`
- **Type**: String
- **Description**: AWS region
- **Examples**: `us-east-1`, `eu-west-1`, `ap-southeast-1`

#### AWS_S3_BUCKET
- **Type**: String
- **Description**: S3 bucket name
- **Example**: `AWS_S3_BUCKET=spvb-downloads`

#### AWS_S3_FOLDER
- **Type**: String
- **Description**: Folder path in S3
- **Example**: `AWS_S3_FOLDER=downloads/videos`

**How to Get AWS S3:**

1. Go to: https://aws.amazon.com
2. Create account
3. Create IAM user with S3 access
4. Create S3 bucket
5. Get access key ID & secret
6. Add to .env

---

### Google Cloud Storage

#### GOOGLE_CLOUD_PROJECT_ID
- **Type**: String
- **Description**: Google Cloud project ID
- **Example**: `GOOGLE_CLOUD_PROJECT_ID=my-project-12345`

#### GOOGLE_CLOUD_STORAGE_BUCKET
- **Type**: String
- **Description**: GCS bucket name
- **Example**: `GOOGLE_CLOUD_STORAGE_BUCKET=spvb-downloads`

#### GOOGLE_APPLICATION_CREDENTIALS
- **Type**: String
- **Description**: Path to service account JSON key
- **Example**: `GOOGLE_APPLICATION_CREDENTIALS=/app/gcs-key.json`

**How to Get Google Cloud Storage:**

1. Go to: https://cloud.google.com
2. Create project
3. Enable Cloud Storage API
4. Create service account
5. Download JSON key
6. Add to .env

---

### Redis (Session Cache)

#### REDIS_URL
- **Type**: String
- **Format**: `redis://[password@]host:port/db`
- **Example**: `REDIS_URL=redis://localhost:6379`

#### REDIS_PASSWORD
- **Type**: String
- **Description**: Redis password (if required)
- **Example**: `REDIS_PASSWORD=your_redis_password`

#### REDIS_DB
- **Default**: `0`
- **Type**: Number
- **Description**: Redis database number
- **Example**: `REDIS_DB=0`

**How to Get Redis:**

```bash
# Local Redis
brew install redis      # macOS
sudo apt-get install redis-server  # Linux

# Start Redis
redis-server
```

**Or Cloud:**
- Heroku Redis
- AWS ElastiCache
- Azure Cache for Redis

---

## 🔑 External Services & API Keys

### YouTube API
```env
YOUTUBE_API_KEY=your_youtube_api_key
```
- Get from: https://console.developers.google.com
- Free quota: 10,000 units/day

### Instagram API
```env
INSTAGRAM_API_KEY=your_instagram_api_key
```
- Get from: https://developers.facebook.com

### TikTok API
```env
TIKTOK_API_KEY=your_tiktok_api_key
```
- Get from: https://developers.tiktok.com

### Sentry (Error Tracking)
```env
SENTRY_DSN=https://key@sentry.io/project_id
```
- Get from: https://sentry.io
- Free tier: 5,000 events/month

### Google Analytics
```env
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
```
- Get from: https://analytics.google.com

---

## 📁 File Management

### MAX_UPLOAD_SIZE
- **Default**: `52428800` (50MB)
- **Type**: Number (bytes)
- **Formula**: Size in MB × 1024 × 1024
- **Examples**:
  - 10MB: `10485760`
  - 50MB: `52428800`
  - 100MB: `104857600`

### TEMP_DIR
- **Default**: `/tmp/spvb`
- **Type**: String
- **Description**: Temporary directory for file processing
- **Example**: `TEMP_DIR=/tmp/spvb-temp`

### UPLOAD_DIR
- **Default**: `./uploads`
- **Type**: String
- **Description**: Directory for local file uploads
- **Example**: `UPLOAD_DIR=/var/spvb/uploads`

---

## 🧹 Cleanup & Maintenance

### CLEANUP_INTERVAL
- **Default**: `300` (5 minutes in seconds)
- **Type**: Number
- **Description**: How often to run cleanup
- **Examples**:
  - Every 1 minute: `60`
  - Every 5 minutes: `300`
  - Every 30 minutes: `1800`

### CLEANUP_TIME_LIMIT
- **Default**: `1800` (30 minutes in seconds)
- **Type**: Number
- **Description**: Delete files older than this
- **Examples**:
  - 15 minutes: `900`
  - 30 minutes: `1800`
  - 1 hour: `3600`

### ENABLE_AUTO_CLEANUP
- **Default**: `true`
- **Type**: Boolean
- **Description**: Enable/disable automatic cleanup
- **Example**: `ENABLE_AUTO_CLEANUP=true`

---

## ⬇️ Download Settings

### MAX_CONCURRENT_DOWNLOADS
- **Default**: `5`
- **Type**: Number
- **Description**: Maximum simultaneous downloads
- **Example**: `MAX_CONCURRENT_DOWNLOADS=5`

### DOWNLOAD_TIMEOUT
- **Default**: `30000` (30 seconds in milliseconds)
- **Type**: Number
- **Formula**: Seconds × 1000
- **Examples**:
  - 30 seconds: `30000`
  - 60 seconds: `60000`
  - 5 minutes: `300000`

### DOWNLOAD_RETRY_ATTEMPTS
- **Default**: `3`
- **Type**: Number
- **Description**: Retry failed downloads
- **Example**: `DOWNLOAD_RETRY_ATTEMPTS=3`

---

## 📊 Analytics & Monitoring

### ENABLE_ANALYTICS
- **Default**: `true`
- **Type**: Boolean
- **Description**: Enable/disable analytics
- **Example**: `ENABLE_ANALYTICS=true`

### REQUEST_LOGGING
- **Default**: `true`
- **Type**: Boolean
- **Description**: Log all HTTP requests
- **Example**: `REQUEST_LOGGING=true`

### PRETTY_LOGS
- **Default**: `true`
- **Type**: Boolean
- **Description**: Format logs with colors
- **Example**: `PRETTY_LOGS=true`

---

## 📧 Email Configuration

### SMTP_HOST
```env
SMTP_HOST=smtp.gmail.com
```

### SMTP_PORT
```env
SMTP_PORT=587
```

### SMTP_USER
```env
SMTP_USER=your_email@gmail.com
```

### SMTP_PASSWORD
- **Gmail**: Use App Password (not regular password)
- Get from: https://myaccount.google.com/apppasswords

```env
SMTP_PASSWORD=your_app_password
```

### SMTP_FROM
```env
SMTP_FROM=support@spvbdownloader.com
```

---

## ⚡ Rate Limiting

### RATE_LIMIT_REQUESTS
- **Default**: `100`
- **Type**: Number
- **Description**: Max requests per window
- **Example**: `RATE_LIMIT_REQUESTS=100`

### RATE_LIMIT_WINDOW
- **Default**: `60000` (1 minute in milliseconds)
- **Type**: Number
- **Example**: `RATE_LIMIT_WINDOW=60000`

---

## 🚀 Feature Flags

```env
FEATURE_INSTAGRAM_DOWNLOAD=true
FEATURE_FACEBOOK_DOWNLOAD=true
FEATURE_TIKTOK_DOWNLOAD=true
FEATURE_TWITTER_DOWNLOAD=true
FEATURE_YOUTUBE_DOWNLOAD=false
```

Enable/disable download support for specific platforms.

---

## 🪝 Webhooks

### WEBHOOK_URL
```env
WEBHOOK_URL=https://your-webhook-endpoint.com/downloads
```

### WEBHOOK_SECRET
```env
WEBHOOK_SECRET=your_webhook_secret_key
```

Send notifications to external systems on download completion.

---

## 🛠️ Development Settings

### DEBUG
- **Default**: `true` (development), `false` (production)
- **Type**: Boolean
- **Description**: Enable debug mode
- **Example**: `DEBUG=true`

---

## 📋 Complete Example .env Files

### Development (Local)

```env
# Server
PORT=1406
NODE_ENV=development
LOG_LEVEL=debug

# Security
JWT_SECRET=spvb-local-development-key-2026
CORS_ORIGIN=http://localhost:1404
SESSION_TIMEOUT=1800000

# Database
MONGODB_URI=mongodb://localhost:27017/spvb
MONGODB_DB_NAME=spvb

# Storage (optional for local)
TEMP_DIR=/tmp/spvb
UPLOAD_DIR=./uploads

# Cleanup
CLEANUP_INTERVAL=300
CLEANUP_TIME_LIMIT=1800
ENABLE_AUTO_CLEANUP=true

# Development
DEBUG=true
PRETTY_LOGS=true
REQUEST_LOGGING=true
```

### Production (With Cloudinary & MongoDB Atlas)

```env
# Server
PORT=1406
NODE_ENV=production
LOG_LEVEL=info

# Security
JWT_SECRET=your-production-secret-key-min-32-chars
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true
SESSION_TIMEOUT=3600000

# Database - MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster0.mongodb.net/spvb?retryWrites=true&w=majority
MONGODB_DB_NAME=spvb

# Storage - Cloudinary
CLOUDINARY_URL=cloudinary://KEY:SECRET@CLOUD_NAME
CLOUDINARY_FOLDER=spvb/production

# Cache - Redis (optional)
REDIS_URL=redis://production-redis.example.com:6379

# Cleanup
CLEANUP_INTERVAL=600
CLEANUP_TIME_LIMIT=3600
ENABLE_AUTO_CLEANUP=true

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=support@spvbdownloader.com

# Analytics
ENABLE_ANALYTICS=true
SENTRY_DSN=https://key@sentry.io/123456

# Development
DEBUG=false
PRETTY_LOGS=false
REQUEST_LOGGING=false
```

---

## ✅ Validation Checklist

Before deploying, ensure:

- [ ] JWT_SECRET is at least 32 characters
- [ ] MONGODB_URI is correct and accessible
- [ ] CLOUDINARY_URL or AWS credentials are valid
- [ ] CORS_ORIGIN matches frontend URL
- [ ] All required API keys are provided
- [ ] SESSION_TIMEOUT is in milliseconds
- [ ] File size limits are appropriate
- [ ] Email credentials are correct (if using)
- [ ] NODE_ENV is set correctly
- [ ] LOG_LEVEL is appropriate for environment

---

## 🔗 Quick Links

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Cloudinary](https://cloudinary.com)
- [AWS S3](https://aws.amazon.com/s3)
- [Google Cloud Storage](https://cloud.google.com/storage)
- [Redis Cloud](https://redis.com/try-free/)
- [Sentry](https://sentry.io)
- [Google Analytics](https://analytics.google.com)

---

## 📞 Support

For issues with specific services:

1. Check service documentation
2. Verify credentials in .env
3. Test connection manually
4. Check application logs
5. Refer to service status page

---

**Last Updated**: 2026-09-02  
**Version**: 1.0
