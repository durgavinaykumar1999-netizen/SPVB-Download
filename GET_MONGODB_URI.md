# Get Correct MongoDB Connection String

## Issue
DNS lookup failing for `spvb-download.mongodb.net`

**Possible causes:**
1. Cluster name is incorrect
2. Cluster doesn't exist
3. Cluster name has numbers/special characters we don't know about

## Solution: Get Exact Connection String from MongoDB Atlas

### Step 1: Go to MongoDB Atlas
**URL:** https://cloud.mongodb.com

### Step 2: Find Your Cluster
**Left sidebar → Databases**

You should see your cluster listed. Look for:
- Cluster name (e.g., "Cluster0", "my-db", "spvb-db", etc.)
- Status (should be "Active")

### Step 3: Click "Connect" on Your Cluster

**You should see:**
```
┌──────────────────────────────────────────┐
│  Connect to spvb-download (or your name) │
│                                          │
│  [Choose a connection method]            │
│  - Drivers                               │
│  - MongoDB Compass                       │
│  - mongosh                               │
│  - Connect your application              │
└──────────────────────────────────────────┘
```

### Step 4: Click "Drivers"

### Step 5: Select "Python"

### Step 6: Copy the Connection String

You should see something like:
```
mongodb+srv://<username>:<password>@CLUSTER_NAME.mongodb.net/?retryWrites=true&w=majority
```

### Step 7: Replace Variables

In the connection string, replace:
- `<username>` → `vinaymail1820_db_user`
- `<password>` → `AUu1N5ZlHNCyet3k`
- `CLUSTER_NAME` → Copy exactly as shown (this is what you need!)

### Step 8: Full Connection String

After replacement, it should look like:
```
mongodb+srv://vinaymail1820_db_user:AUu1N5ZlHNCyet3k@CLUSTER_NAME.mongodb.net/spvb-downloader?retryWrites=true&w=majority
```

---

## Example Formats (yours might look different)

**Example 1:**
```
mongodb+srv://vinaymail1820_db_user:AUu1N5ZlHNCyet3k@cluster0.mongodb.net/spvb-downloader?retryWrites=true&w=majority
```

**Example 2:**
```
mongodb+srv://vinaymail1820_db_user:AUu1N5ZlHNCyet3k@spvb-db-xyz.mongodb.net/spvb-downloader?retryWrites=true&w=majority
```

**Example 3:**
```
mongodb+srv://vinaymail1820_db_user:AUu1N5ZlHNCyet3k@m220.mongodb.net/spvb-downloader?retryWrites=true&w=majority
```

---

## After Getting the Correct Connection String

**Tell me the CLUSTER_NAME part** (the part before `.mongodb.net`)

For example:
- If connection string is: `mongodb+srv://user:pass@**Cluster0**.mongodb.net/...`
- Then cluster name is: `Cluster0`

Once you provide that, I'll:
1. Update the .env file
2. Test MongoDB connection
3. Run the complete end-to-end test

---

## Screenshot Guide

**Where to find the connection string:**

```
MongoDB Atlas
    ↓
Click Your Cluster
    ↓
Click "Connect" button
    ↓
Click "Drivers" tab
    ↓
Select "Python"
    ↓
You see: mongodb+srv://...@CLUSTER_NAME.mongodb.net/...
         ✓ Copy this exact string
```

---

## What I Need From You

**Please provide:**
1. The EXACT connection string from MongoDB Atlas (copy the whole thing)
2. OR just the cluster name (the part before `.mongodb.net`)

For example:
- "My connection string is: `mongodb+srv://vinaymail1920_db_user:password@my-cluster-xyz.mongodb.net/...`"
- OR "My cluster name is: `my-cluster-xyz`"

Once you provide this, I'll update the .env and test immediately! 👇
