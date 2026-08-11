# Finding Your MongoDB Atlas Cluster Name

## Steps to Get Correct Connection String

### 1. Go to MongoDB Atlas Dashboard
- URL: https://cloud.mongodb.com
- Log in with your account

### 2. Find Your Cluster
- Look for a list of clusters on the left sidebar
- You should see at least one cluster listed
- Note the name (e.g., "Cluster0", "my-database", "spvb-db", etc.)

### 3. Get Connection String
1. Click on your cluster name
2. Click the **"Connect"** button
3. Click **"Drivers"** (not "MongoDB Compass")
4. Select **"Python"** from the dropdown
5. Copy the connection string

### 4. Replace Credentials
In the connection string, you'll see:
```
mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/?retryWrites=true&w=majority
```

Replace with your credentials:
- `<username>` → `vinaymail1820_db_user`
- `<password>` → `q8lOQH5blNq3Ohd0`
- `<cluster-name>` → Copy the actual name from MongoDB Atlas

### Example
If your cluster is named `mycluster0`, your full URI should be:
```
mongodb+srv://vinaymail1820_db_user:q8lOQH5blNq3Ohd0@mycluster0.mongodb.net/?retryWrites=true&w=majority
```

## If You Can't Find Your Cluster

**If no cluster is listed:**
1. Create a new cluster:
   - Click **"Create"** or **"Build a Cluster"**
   - Choose **M0 Free Tier**
   - Name it something (e.g., "spvb-db")
   - Click **"Create Cluster"**
   - Wait for cluster to deploy (2-5 minutes)

2. Once created, follow steps 3-4 above

## Verify Connection Works

Once you have the correct cluster name:

1. **Update `.env` file:**
   ```
   MONGODB_URI=mongodb+srv://vinaymail1820_db_user:q8lOQH5blNq3Ohd0@YOUR_ACTUAL_CLUSTER_NAME.mongodb.net/?retryWrites=true&w=majority
   ```

2. **Test the connection:**
   ```bash
   python3 test_mongodb_connection.py
   ```

3. **Expected output:**
   ```
   ✅ Connection successful!
   📊 Server Info:
      Version: 7.0.0
   📂 Collections in 'spvb-downloader' database:
      (No collections yet - will be created on first download)
   ```

## Troubleshooting

### Error: "DNS query name does not exist"
- **Cause:** Wrong cluster name
- **Fix:** Check MongoDB Atlas dashboard for actual cluster name

### Error: "Authentication failed"
- **Cause:** Wrong username or password
- **Fix:** Verify credentials:
  1. Go to MongoDB Atlas → Database Access
  2. Find user: `vinaymail1820_db_user`
  3. Verify password is correct

### Error: "IP address not in whitelist"
- **Cause:** Your current IP is not allowed
- **Fix:** 
  1. Go to MongoDB Atlas → Security → Network Access
  2. Click **"Add IP Address"**
  3. Either:
     - Add your current IP: Click "Add Current IP Address"
     - Allow all IPs (for development only): Click "0.0.0.0/0"
   4. Click **"Confirm"**

### Error: "Cluster is paused"
- **Cause:** Free tier cluster went to sleep (after 60 days of inactivity)
- **Fix:** 
  1. Go to Clusters
  2. Click the cluster name
  3. Click **"Resume"**

## Getting Help

If still not working:
1. Take a screenshot of your MongoDB Atlas dashboard (cluster list)
2. Share the cluster name (if visible)
3. Run: `python3 test_mongodb_connection.py` and share the error
4. We can debug from there

---

**Important:** Your connection string contains credentials - never commit to GitHub!
Always store it in `.env` (which is in `.gitignore`)
