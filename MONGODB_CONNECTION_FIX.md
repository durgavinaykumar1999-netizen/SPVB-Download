# MongoDB Atlas Connection Fix

## Issue
DNS lookup for `spvb-download.mongodb.net` failed.

## Solution Checklist

### 1. Whitelist Your IP Address (MOST LIKELY ISSUE)

**Steps:**
1. Go to https://cloud.mongodb.com
2. Click on your project
3. Go to **Security** → **Network Access**
4. Click **"Add IP Address"**
5. Choose one of:
   - **"Add Current IP Address"** (Recommended for local testing)
   - Or enter: `0.0.0.0/0` (Allow all - NOT recommended for production)
6. Click **"Confirm"**
7. Wait 1-2 minutes for it to take effect

### 2. Verify Cluster Name

**Steps:**
1. Go to https://cloud.mongodb.com
2. Go to **Databases**
3. Look for your cluster name
   - Should be something like: `Cluster0`, `spvb-download`, `my-database`, etc.
   - NOT just `cluster0`
4. **Click "Connect"** on your cluster
5. Select **"Drivers"** → **"Python"**
6. Copy the connection string
7. Extract the cluster name from the string
   - Format: `mongodb+srv://user:password@[CLUSTER_NAME].mongodb.net/`

### 3. Update .env File

Once you have the correct cluster name:

```bash
# Edit backend_python/.env
MONGODB_URI=mongodb+srv://vinaymail1820_db_user:AUu1N5ZlHNCyet3k@[YOUR_CLUSTER_NAME].mongodb.net/spvb-downloader?retryWrites=true&w=majority
```

Replace `[YOUR_CLUSTER_NAME]` with your actual cluster name

### 4. Test Connection

```bash
cd /home/dev26/Downloads/SPVB-Download-main

python3 << 'EOF'
import sys
sys.path.insert(0, 'backend_python')
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv('backend_python/.env')
mongodb_uri = os.getenv('MONGODB_URI')

try:
    client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print("✅ MongoDB connection successful!")
except Exception as e:
    print(f"❌ Failed: {str(e)}")
EOF
```

---

## Common Cluster Name Formats

Your cluster name is usually one of these:
- `spvb-download` ✅ (You provided this)
- `Cluster0` (Default name)
- `cluster-1`, `cluster-2`, etc.
- `my-database-name`

---

## If Still Not Working

**Run this diagnostic:**

```bash
# Check if we can reach MongoDB Atlas at all
ping spvb-download.mongodb.net

# Or use curl
curl -I https://spvb-download.mongodb.net
```

If both fail:
- IP is not whitelisted
- Cluster doesn't exist with that name
- Network firewall blocking

---

## After Connection Works

Once you see `✅ MongoDB connection successful!`:

1. Start backend:
   ```bash
   python3 -m uvicorn backend_python.main:app --reload --port 8000
   ```

2. Start frontend (in another terminal):
   ```bash
   cd frontend
   npm start
   ```

3. Test at: http://localhost:3000

---

## Quick Checklist

- [ ] Go to MongoDB Atlas
- [ ] Go to Security → Network Access
- [ ] Add Current IP Address (or 0.0.0.0/0)
- [ ] Wait 1-2 minutes
- [ ] Verify cluster name is correct
- [ ] Update .env with correct cluster name
- [ ] Run test connection script
- [ ] Start backend and frontend
- [ ] Test in browser
