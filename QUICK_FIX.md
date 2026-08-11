# Quick Fix - MongoDB Connection Issue

## Problem
Your MongoDB connection string uses `cluster0` which doesn't exist.

## Solution (3 Steps)

### Step 1: Find Your Cluster Name
1. Go to https://cloud.mongodb.com
2. Log in
3. Look at your clusters list - what's it called?
   - Examples: `Cluster0`, `cluster-1`, `my-db`, `spvb-db`, etc.

### Step 2: Update `.env` File
Replace `cluster0` with your actual cluster name:

**Current (WRONG):**
```
MONGODB_URI=mongodb+srv://vinaymail1820_db_user:q8lOQH5blNq3Ohd0@cluster0.mongodb.net/?retryWrites=true&w=majority
```

**Should be (EXAMPLE - replace `mycluster` with YOUR cluster name):**
```
MONGODB_URI=mongodb+srv://vinaymail1820_db_user:q8lOQH5blNq3Ohd0@mycluster.mongodb.net/?retryWrites=true&w=majority
```

### Step 3: Test Connection
Run this command:
```bash
python3 test_mongodb_connection.py
```

**Expected result:**
```
✅ Connection successful!
```

## If Still Not Working

### Issue: "Can't find my cluster"
→ Follow: MONGODB_ATLAS_SETUP.md

### Issue: "Authentication failed"
→ Check username/password in MongoDB Atlas Database Access section

### Issue: "IP not whitelisted"
→ Go to Security → Network Access → Add your IP

## Once Connected ✅

Your backend will now be able to:
- ✅ Store download records
- ✅ Track progress
- ✅ Store filenames for auto-download
- ✅ Function properly on Render

Then:
1. Update env vars on Render dashboard
2. Redeploy service
3. Test auto-download endpoint again
