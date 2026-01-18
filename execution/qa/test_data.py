"""
Test data setup and cleanup for QA testing.
Creates sample data in qa_* collections without touching production.

Usage:
    python test_data.py setup    # Create test data
    python test_data.py cleanup  # Remove all qa_* data
"""

import os
import sys
import json
from datetime import datetime, timedelta


# Firebase Admin SDK setup
def get_firestore_client():
    """Initialize Firestore client using Firebase Admin SDK."""
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError:
        print("[ERROR] firebase-admin not installed. Run: pip install firebase-admin")
        return None
    
    # Look for credentials file
    cred_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'firebase-admin-key.json'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'serviceAccountKey.json'),
        os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', ''),
    ]
    
    cred_file = None
    for path in cred_paths:
        if path and os.path.exists(path):
            cred_file = path
            break
    
    if not cred_file:
        print("[ERROR] Firebase credentials not found.")
        print("Please place 'firebase-admin-key.json' in the project root")
        print("or set GOOGLE_APPLICATION_CREDENTIALS environment variable")
        return None
    
    try:
        # Check if already initialized
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(cred_file)
        firebase_admin.initialize_app(cred)
    
    return firestore.client()


# QA Collections (prefixed with qa_)
QA_COLLECTIONS = [
    'qa_batches',
    'qa_expenses', 
    'qa_yearlyExpenses',
    'qa_employees',
    'qa_crops',
    'qa_fruits',
    'qa_invoices'
]


def setup_test_data():
    """Create sample test data in qa_* collections."""
    db = get_firestore_client()
    if not db:
        return False
    
    print("[QA] Setting up test data...")
    
    today = datetime.now()
    
    # Create test batches
    batches = [
        {
            'id': 'Goat-1',
            'name': 'QA Test Goat Batch',
            'type': 'Goat',
            'date': (today - timedelta(days=30)).strftime('%Y-%m-%d'),
            'status': 'Raising',
            'expenses': [],
            'animals': [
                {
                    'id': 'GTJANM26-1',
                    'gender': 'Male',
                    'weight': 25,
                    'purchaseCost': 8000,
                    'status': 'Healthy',
                    'entryDate': today.strftime('%Y-%m-%d'),
                    'weightHistory': [{'date': today.strftime('%Y-%m-%d'), 'weight': 25}]
                },
                {
                    'id': 'GTJANF26-1',
                    'gender': 'Female',
                    'weight': 22,
                    'purchaseCost': 7500,
                    'status': 'Healthy',
                    'entryDate': today.strftime('%Y-%m-%d'),
                    'weightHistory': [{'date': today.strftime('%Y-%m-%d'), 'weight': 22}]
                }
            ],
            'createdAt': today.isoformat()
        },
        {
            'id': 'Sheep-1',
            'name': 'QA Test Sheep Batch',
            'type': 'Sheep',
            'date': (today - timedelta(days=20)).strftime('%Y-%m-%d'),
            'status': 'Raising',
            'expenses': [],
            'animals': [
                {
                    'id': 'SHJANM26-1',
                    'gender': 'Male',
                    'weight': 30,
                    'purchaseCost': 6000,
                    'status': 'Healthy',
                    'entryDate': today.strftime('%Y-%m-%d'),
                    'weightHistory': [{'date': today.strftime('%Y-%m-%d'), 'weight': 30}]
                }
            ],
            'createdAt': today.isoformat()
        },
        {
            'id': 'Poultry-1',
            'name': 'QA Test Poultry Batch',
            'type': 'Poultry',
            'date': (today - timedelta(days=10)).strftime('%Y-%m-%d'),
            'status': 'Raising',
            'expenses': [],
            'animals': [],
            'createdAt': today.isoformat()
        },
        {
            'id': 'Cow-1',
            'name': 'QA Test Cow Batch',
            'type': 'Cow',
            'date': (today - timedelta(days=5)).strftime('%Y-%m-%d'),
            'status': 'Raising',
            'expenses': [],
            'animals': [],
            'createdAt': today.isoformat()
        }
    ]
    
    # Create test expenses
    expenses = [
        {
            'id': 'exp-qa-001',
            'description': 'QA Test Feed Expense',
            'category': 'Feed',
            'amount': 5000,
            'date': today.strftime('%Y-%m-%d'),
            'batchId': 'Goat-1',
            'createdAt': today.isoformat()
        },
        {
            'id': 'exp-qa-002',
            'description': 'QA Test Medical Expense',
            'category': 'Medical',
            'amount': 1500,
            'date': (today - timedelta(days=5)).strftime('%Y-%m-%d'),
            'batchId': 'Sheep-1',
            'createdAt': today.isoformat()
        }
    ]
    
    # Create test employees
    employees = [
        {
            'id': 'emp-qa-001',
            'name': 'QA Test Worker 1',
            'role': 'Farm Hand',
            'phone': '9999999991',
            'salary': 15000,
            'status': 'Active',
            'createdAt': today.isoformat()
        },
        {
            'id': 'emp-qa-002',
            'name': 'QA Test Worker 2',
            'role': 'Supervisor',
            'phone': '9999999992',
            'salary': 25000,
            'status': 'Active',
            'createdAt': today.isoformat()
        }
    ]
    
    # Write to Firestore
    try:
        # Batches
        for batch in batches:
            db.collection('qa_batches').document(batch['id']).set(batch)
            print(f"  Created batch: {batch['id']}")
        
        # Expenses
        for expense in expenses:
            db.collection('qa_expenses').document(expense['id']).set(expense)
            print(f"  Created expense: {expense['id']}")
        
        # Employees
        for emp in employees:
            db.collection('qa_employees').document(emp['id']).set(emp)
            print(f"  Created employee: {emp['id']}")
        
        print(f"\n[QA] Test data setup complete!")
        print(f"  - {len(batches)} batches")
        print(f"  - {len(expenses)} expenses")
        print(f"  - {len(employees)} employees")
        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to create test data: {e}")
        return False


def cleanup_test_data():
    """Delete all documents in qa_* collections."""
    db = get_firestore_client()
    if not db:
        return False
    
    print("[QA] Cleaning up test data...")
    
    total_deleted = 0
    
    for coll_name in QA_COLLECTIONS:
        try:
            docs = db.collection(coll_name).stream()
            count = 0
            for doc in docs:
                doc.reference.delete()
                count += 1
            if count > 0:
                print(f"  Deleted {count} documents from {coll_name}")
            total_deleted += count
        except Exception as e:
            print(f"  Warning: Error cleaning {coll_name}: {e}")
    
    print(f"\n[QA] Cleanup complete! Deleted {total_deleted} total documents.")
    return True


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    command = sys.argv[1].lower()
    
    if command == 'setup':
        setup_test_data()
    elif command == 'cleanup':
        cleanup_test_data()
    else:
        print(f"Unknown command: {command}")
        print("Use: setup or cleanup")


if __name__ == '__main__':
    main()
