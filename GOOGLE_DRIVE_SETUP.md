# Google Drive API Setup Instructions

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter your project name (e.g., "iron-store-backup")
5. Click "Create"

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, make sure your new project is selected
2. Go to "APIs & Services" → "Library"
3. Search for "Google Drive API"
4. Click on it and click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" (unless you have a Google Workspace account)
   - Fill in the required fields:
     - App name: "Iron Store Backup System"
     - User support email: Your email
     - Developer contact email: Your email
   - Add scopes: `https://www.googleapis.com/auth/drive.file`
   - Add test users: Your email address
4. For Application type, choose "Desktop application"
5. Name: "Iron Store Desktop App"
6. Click "Create"

## Step 4: Download Credentials

1. After creating the OAuth client, click the download button (⬇️)
2. Save the JSON file as `google-credentials.json`
3. **IMPORTANT**: Keep this file secure and never commit it to version control

## Step 5: Set Up Environment Variables

Create a `.env` file in your project root with the following content:

```env
# Google Drive API Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8080

# Backup Configuration
BACKUP_ENCRYPTION_KEY=your_backup_encryption_key_here
BACKUP_FOLDER_NAME=IronStoreBackups
```

**To get your client ID and secret:**
1. Open the downloaded `google-credentials.json` file
2. Copy the `client_id` value to `GOOGLE_CLIENT_ID`
3. Copy the `client_secret` value to `GOOGLE_CLIENT_SECRET`

## Step 6: Generate Encryption Key

Run this command in your terminal to generate a secure encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as your `BACKUP_ENCRYPTION_KEY` in the `.env` file.

## Step 7: Test the Setup

Once you've completed the above steps:

1. Start your application
2. Go to the Backup Settings page
3. Click on the "Testing" tab
4. Run the "Backup Test" to verify everything is working

## Security Notes

- Never share your `google-credentials.json` file
- Never commit your `.env` file to version control
- The OAuth consent screen will show a warning for unverified apps - this is normal for personal use
- Your encryption key should be at least 64 characters long for maximum security

## Troubleshooting

If you encounter issues:

1. **"Access blocked" error**: Make sure you've added your email as a test user in the OAuth consent screen
2. **"Redirect URI mismatch"**: Ensure the redirect URI in your OAuth client matches exactly: `http://localhost:8080`
3. **API not enabled**: Double-check that the Google Drive API is enabled for your project
4. **Quota exceeded**: Google Drive API has rate limits, but they're generous for personal use

## Production Deployment

For production use:
1. Verify your OAuth app in Google Cloud Console
2. Set up proper domain verification
3. Use environment-specific credentials
4. Consider using service accounts for server applications
