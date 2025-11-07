# Firebase Security Rules Setup Guide

This guide explains how to deploy and configure Firebase security rules for the Mooma application.

## Prerequisites

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project (if not already done):
```bash
firebase init
```

## Security Rules Overview

### Firestore Rules (`firestore.rules`)

The Firestore rules implement the following security measures:

#### **Users Collection**
- ✅ Users can only read/write their own data
- ✅ Validates required fields on creation
- ✅ Restricts updates to specific fields only
- ✅ Prevents user document deletion
- ✅ Ensures email matches authenticated user

#### **Sensitive Collections**
- **Medical Records**: Requires email verification
- **Pregnancies**: User-scoped access only
- **User Sessions**: For "remember me" functionality
- **Appointments**: User-scoped with timestamp validation

#### **Community Features**
- **Messages**: Users can create/edit their own messages
- **Articles**: Public read, admin-only write

### Storage Rules (`storage.rules`)

#### **User Files**
- **Profile Pictures**: 10MB limit, image files only
- **Pregnancy Photos**: User-scoped, image files only
- **Medical Documents**: Email verification required, 20MB limit

#### **Community Content**
- **Public Files**: Read-only access
- **Community Images**: Authenticated users can upload

## Deployment Commands

### Deploy All Rules
```bash
firebase deploy
```

### Deploy Specific Rules
```bash
# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Storage rules
firebase deploy --only storage

# Deploy only indexes
firebase deploy --only firestore:indexes
```

## Environment Variables

Create a `.env.local` file with:
```env
NEXT_PUBLIC_ENCRYPTION_KEY=your-super-secret-encryption-key-here
```

**⚠️ Security Note**: Use a strong, unique encryption key in production!

## Testing Rules

### Firestore Rules Testing
```bash
firebase emulators:start --only firestore
```

### Storage Rules Testing
```bash
firebase emulators:start --only storage
```

## Security Best Practices Implemented

### 🔐 **Authentication**
- All sensitive operations require authentication
- User identity verification on all user-scoped data
- Email verification for medical records

### 🛡️ **Data Validation**
- Required field validation
- Data type checking
- File size and type restrictions
- Timestamp validation

### 🔒 **Access Control**
- User can only access their own data
- Admin-only operations for public content
- Granular permissions per collection

### 📊 **Audit Trail**
- Automatic timestamp validation
- User ID verification
- Immutable creation timestamps

## Rule Structure Explanation

```javascript
// Basic authentication check
function isAuthenticated() {
  return request.auth != null;
}

// User ownership verification
function isOwner(userId) {
  return request.auth.uid == userId;
}

// Data validation functions
function isValidUserData() {
  // Validates required fields and data types
}
```

## Monitoring and Maintenance

1. **Monitor Rule Usage**: Check Firebase Console for rule evaluation metrics
2. **Regular Audits**: Review access patterns and update rules as needed
3. **Error Monitoring**: Watch for permission denied errors in logs
4. **Performance**: Monitor rule complexity and evaluation time

## Common Issues and Solutions

### Permission Denied Errors
- Verify user authentication status
- Check if user is accessing their own data
- Ensure required fields are present

### File Upload Issues
- Check file size limits
- Verify file type restrictions
- Ensure user has proper permissions

### Index Errors
- Deploy custom indexes using `firestore.indexes.json`
- Monitor console for index creation suggestions

## Production Deployment Checklist

- [ ] Update encryption key in environment variables
- [ ] Deploy Firestore rules
- [ ] Deploy Storage rules
- [ ] Deploy custom indexes
- [ ] Test authentication flow
- [ ] Verify file upload permissions
- [ ] Monitor error logs
- [ ] Set up backup rules

## Support

For issues with Firebase rules:
1. Check Firebase Console logs
2. Use Firebase emulator for testing
3. Review Firebase documentation
4. Check rule evaluation in Firebase Console
