# Backend Environment Setup Guide

## Overview

The backend needs a `.env` file with database and service credentials. This guide shows how to configure it for local development and Render production.

## File Location

```
backend_python/.env
```

**DO NOT commit `.env` to GitHub** - it contains secrets!

## Required Variables

### 1. MongoDB (Database) - **CRITICAL**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

**Why it's needed:** Stores download records, session data, and file metadata.

**Get MongoDB:**
- **Free option:** [MongoDB Atlas Cloud](https://www.mongodb.com/cloud/atlas)
  1. Create account
  2. Create cluster (M0 free tier)
  3. Create database user
  4. Get connection string: `mongodb+srv://user:pass@cluster...`

- **Local option:** Install MongoDB locally
  ```bash
  # For local development
  MONGODB_URI=mongodb://localhost:27017
  ```

### 2. Cloudinary (File Storage) - **CRITICAL**
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Why it's needed:** Stores downloaded video files (Render filesystem is temporary).

**Get Cloudinary:**
1. [Sign up for free](https://cloudinary.com/users/register_signin)
2. Go to Dashboard
3. Copy:
   - Cloud Name (at top of dashboard)
   - API Key (in Settings → API keys)
   - API Secret (in Settings → API keys)

### 3. Server Configuration - **OPTIONAL** (Defaults provided)
```
NODE_ENV=production
PORT=8000
LOG_LEVEL=info
```

### 4. Session Secret - **OPTIONAL** (Change in production)
```
SESSION_SECRET=your-random-secret-key
```

## Setup Instructions

### Local Development

1. **Copy the example file:**
   ```bash
   cd backend_python
   cp .env.example .env
   ```

2. **Edit `.env` with your credentials:**
   ```bash
   nano .env
   # or use your editor of choice
   ```

3. **Add your values:**
   ```
   MONGODB_URI=mongodb://localhost:27017
   CLOUDINARY_CLOUD_NAME=your-value
   CLOUDINARY_API_KEY=your-value
   CLOUDINARY_API_SECRET=your-value
   ```

4. **Test the connection:**
   ```bash
   python3 -c "from backend_python.config.env import config; print('MongoDB:', config.mongodb_uri); print('Cloudinary:', config.cloudinary_cloud_name)"
   ```

### Render Production Setup

**Important:** Never commit `.env` to GitHub! Use Render's Environment Variables instead.

#### Method 1: Render Dashboard (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your SPVB Downloader service
3. Go to **Settings** → **Environment**
4. Add each variable:
   - `MONGODB_URI` = Your MongoDB Atlas URI
   - `CLOUDINARY_CLOUD_NAME` = Your cloud name
   - `CLOUDINARY_API_KEY` = Your API key
   - `CLOUDINARY_API_SECRET` = Your API secret
   - `NODE_ENV` = `production`
   - `PORT` = `8000`

5. **Deploy** - Render will restart the service with new env vars

#### Method 2: Render Environment Variables in render.yaml

If using `render.yaml` deployment config:

```yaml
services:
  - type: web
    name: spvb-download-backend
    env: python
    buildCommand: "pip install -r backend_python/requirements.txt"
    startCommand: "uvicorn backend_python.main:app --host 0.0.0.0 --port 8000"
    envVars:
      - key: MONGODB_URI
        sync: false  # Set manually in dashboard
      - key: CLOUDINARY_CLOUD_NAME
        sync: false
      - key: CLOUDINARY_API_KEY
        sync: false
      - key: CLOUDINARY_API_SECRET
        sync: false
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 8000
```

### Docker (if using containers)

Create `Dockerfile` with:
```dockerfile
FROM python:3.11
WORKDIR /app
COPY . .
RUN pip install -r backend_python/requirements.txt
CMD ["uvicorn", "backend_python.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Environment variables will be injected by Render at runtime.

## Verification Checklist

After setting up `.env`:

- [ ] Can connect to MongoDB
  ```bash
  python3 -c "from pymongo import MongoClient; c = MongoClient('YOUR_MONGODB_URI'); print(c.admin.command('ping'))"
  ```

- [ ] Cloudinary credentials are correct
  ```bash
  python3 -c "import cloudinary; cloudinary.config(cloud_name='X', api_key='Y', api_secret='Z'); print('OK')"
  ```

- [ ] Backend starts without errors
  ```bash
  python3 -m uvicorn backend_python.main:app --reload
  ```

- [ ] Health check endpoint works
  ```bash
  curl http://localhost:8000/health
  ```

## Troubleshooting

### Error: "MongoDB connection refused"
- **Check:** Is MongoDB running locally or is MongoDB Atlas connection string correct?
- **Fix:** 
  ```bash
  # Local: Start MongoDB
  mongod
  
  # Cloud: Verify connection string format and credentials
  ```

### Error: "Cloudinary: invalid credentials"
- **Check:** Are API key and secret correct?
- **Fix:** Go to Cloudinary Dashboard → Settings → API keys and copy fresh values

### Error: "ModuleNotFoundError: No module named 'python-dotenv'"
- **Fix:** Install requirements
  ```bash
  pip install -r backend_python/requirements.txt
  ```

### Variables not loading in Render
- **Check:** Did you click "Deploy" after adding env vars?
- **Fix:** Redeploy service after setting env vars
  ```bash
  # On Render dashboard: Click "Deploy latest" button
  ```

## Security Best Practices

✅ **DO:**
- [ ] Use strong, random SESSION_SECRET
- [ ] Keep MongoDB URI secret (never in GitHub)
- [ ] Keep Cloudinary API secret safe
- [ ] Use separate credentials for production
- [ ] Rotate API keys periodically
- [ ] Store `.env` file locally only (never commit)

❌ **DON'T:**
- [ ] Commit `.env` to GitHub
- [ ] Share `.env` file publicly
- [ ] Use development secrets in production
- [ ] Hardcode credentials in code
- [ ] Reuse credentials across environments

## Example `.env` for Different Setups

### Local Development with Local MongoDB
```
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017
CLOUDINARY_CLOUD_NAME=dev-cloud
CLOUDINARY_API_KEY=dev-key
CLOUDINARY_API_SECRET=dev-secret
SAVE_PATH=~/Downloads/SPVB-Downloads
```

### Render Production with MongoDB Atlas
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/spvb-downloader?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=prod-cloud
CLOUDINARY_API_KEY=prod-key-xxxxx
CLOUDINARY_API_SECRET=prod-secret-xxxxx
SESSION_SECRET=randomly-generated-secret-key
PORT=8000
```

## Next Steps

1. **Create MongoDB Atlas account** and get connection string
2. **Create Cloudinary account** and get API credentials
3. **Set up `.env`** locally for testing
4. **Configure environment variables** on Render
5. **Test backend** to ensure all services are connected
6. **Monitor logs** for any configuration issues

## Getting Help

If you encounter issues:

1. Check backend logs: `Render Dashboard → Logs`
2. Test local connection: `python3 test_integration.py`
3. Verify env vars loaded: `python3 -c "from backend_python.config.env import config; print(config.__dict__)"`
4. Check requirements installed: `pip list | grep cloudinary`

## Reference

- [MongoDB Atlas Setup](https://docs.mongodb.com/atlas/getting-started/)
- [Cloudinary Dashboard](https://cloudinary.com/console)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [Python dotenv](https://python-dotenv.readthedocs.io/)
