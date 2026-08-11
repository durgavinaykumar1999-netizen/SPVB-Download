#!/usr/bin/env python3
"""Test MongoDB connection with your credentials"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend_python'))

# Load .env
from dotenv import load_dotenv
load_dotenv()

from pymongo import MongoClient
import asyncio

async def test_connection():
    print("\n" + "="*70)
    print("TESTING MONGODB CONNECTION")
    print("="*70)

    mongodb_uri = os.getenv("MONGODB_URI")

    if not mongodb_uri:
        print("\n❌ ERROR: MONGODB_URI not found in .env file")
        print("\nPlease add this to .env:")
        print('  MONGODB_URI=mongodb+srv://vinaymail1820_db_user:q8lOQH5blNq3Ohd0@cluster0.mongodb.net/?retryWrites=true&w=majority')
        print("\nReplace 'cluster0' with your actual cluster name from MongoDB Atlas")
        return False

    # Hide password for display
    display_uri = mongodb_uri.replace("q8lOQH5blNq3Ohd0", "***PASSWORD***")
    print(f"\n📝 Connection String: {display_uri}")

    try:
        print("\n🔄 Connecting to MongoDB...")
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)

        # Attempt to connect
        client.admin.command('ping')

        print("✅ Connection successful!")

        # Get server info
        server_info = client.server_info()
        print(f"\n📊 Server Info:")
        print(f"   Version: {server_info.get('version', 'Unknown')}")

        # Check databases
        db = client["spvb-downloader"]
        collections = db.list_collection_names()
        print(f"\n📂 Collections in 'spvb-downloader' database:")
        if collections:
            for col in collections:
                count = db[col].count_documents({})
                print(f"   - {col} ({count} documents)")
        else:
            print("   (No collections yet - will be created on first download)")

        client.close()
        return True

    except Exception as e:
        print(f"\n❌ Connection failed!")
        print(f"\nError: {str(e)}")
        print(f"\nPossible causes:")
        print("  1. Invalid cluster name (check MongoDB Atlas)")
        print("  2. Wrong username or password")
        print("  3. IP not whitelisted (add your IP in MongoDB Atlas)")
        print("  4. Network connectivity issue")
        print("  5. Cluster doesn't exist or is paused")

        print(f"\n📝 Debugging info:")
        print(f"   URI starts with: {mongodb_uri[:30]}...")
        print(f"   Full error: {type(e).__name__}")

        return False

if __name__ == "__main__":
    success = asyncio.run(test_connection())
    sys.exit(0 if success else 1)
