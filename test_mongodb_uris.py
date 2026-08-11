#!/usr/bin/env python3
"""Test different MongoDB connection string formats"""

from pymongo import MongoClient
import sys

# Different URI formats to test
test_uris = [
    {
        "name": "Current (No Auth)",
        "uri": "mongodb://atlas-sql-6a7aeef6a340b734e59b0af8-wkwzcs.a.query.mongodb.net/myVirtualDatabase?ssl=true&authSource=admin"
    },
    {
        "name": "Standard MongoDB Format (with credentials)",
        "uri": "mongodb+srv://vinaymail1820_db_user:AUu1N5ZlHNCyet3k@atlas-sql-6a7aeef6a340b734e59b0af8-wkwzcs.a.query.mongodb.net/spvb-downloader?retryWrites=true&w=majority"
    },
    {
        "name": "Original Cluster Name (with credentials)",
        "uri": "mongodb+srv://vinaymail1820_db_user:AUu1N5ZlHNCyet3k@spvb-download.mongodb.net/spvb-downloader?retryWrites=true&w=majority"
    }
]

print("\n" + "="*70)
print("TESTING MONGODB CONNECTION STRINGS")
print("="*70)

for test in test_uris:
    print(f"\n📝 Testing: {test['name']}")
    print(f"   URI: {test['uri'][:60]}...")
    
    try:
        client = MongoClient(test['uri'], serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        
        print(f"   ✅ CONNECTION SUCCESSFUL!")
        
        # Get database info
        db = client['spvb-downloader']
        collections = db.list_collection_names()
        print(f"   ✅ Database collections: {collections if collections else '(empty)'}")
        
        client.close()
        
        print(f"\n✅ WORKING CONNECTION STRING:")
        print(f"   {test['uri']}")
        sys.exit(0)
        
    except Exception as e:
        error_msg = str(e)
        if "auth required" in error_msg:
            print(f"   ❌ Auth required (missing username/password)")
        elif "DNS query" in error_msg or "does not exist" in error_msg:
            print(f"   ❌ Cluster not found (wrong cluster name)")
        else:
            print(f"   ❌ Error: {error_msg[:50]}...")

print("\n" + "="*70)
print("❌ NO WORKING CONNECTION FOUND")
print("="*70)
print("\nPlease provide:")
print("1. Correct MongoDB connection string from Atlas")
print("2. OR correct username and password")
print("3. OR correct cluster name")
