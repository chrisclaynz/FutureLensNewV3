# FutureLens Deployment Instructions

This guide provides detailed instructions for deploying the FutureLens application to Hostinger, with alternative deployment options also included.

## Prerequisites

- Node.js and npm installed
- A Supabase account and project
- A Hostinger hosting account
- Git (for version control)

## Environment Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd FutureLens
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Update `src/config.js` to use these environment variables.

## Database Setup

1. Run the database migrations to create tables and enable Row Level Security (RLS):
   ```bash
   npm run migrate
   ```
   This will execute the SQL scripts in `src/migrations/` to set up your Supabase database.

## Building the Frontend

1. Build the project:
   ```bash
   npm run build
   ```
   This will generate static files in the `dist/` directory.

## Deploying to Hostinger

### Option 1: Using File Manager

1. Log in to your Hostinger control panel
2. Navigate to "Hosting" → "Manage" → "File Manager"
3. Navigate to the `public_html` directory
4. Upload the contents of your `dist/` directory:
   - Select all files from your local `dist/` directory
   - Click "Upload" in the File Manager
   - Wait for the upload to complete

### Option 2: Using FTP

1. Get your FTP credentials from Hostinger:
   - Go to "Hosting" → "Manage" → "FTP"
   - Note your FTP hostname, username, and password

2. Use an FTP client (like FileZilla):
   ```
   Host: your-ftp-host.hostinger.com
   Username: your-ftp-username
   Password: your-ftp-password
   Port: 21
   ```

3. Connect and upload:
   - Navigate to the `public_html` directory
   - Upload all contents from your local `dist/` directory

### SSL Configuration

1. In Hostinger dashboard, go to "SSL" section
2. Enable "SSL Certificate" for your domain
3. Wait for SSL to propagate (usually takes a few minutes)

### Domain Configuration

1. In Hostinger dashboard, go to "Domains" → "Manage"
2. Point your domain/subdomain to the hosting
3. Update DNS settings if using a custom domain

## Alternative Deployment Options

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Deploy:
   ```bash
   vercel
   ```

### Deploy to Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
2. Deploy:
   ```bash
   netlify deploy
   ```

### Deploy to GitHub Pages

1. Push your `dist/` directory to a GitHub repository
2. Go to repository settings → "GitHub Pages"
3. Select the branch to deploy

## Post-Deployment Verification

1. Visit your deployed site and verify:
   - Login functionality works
   - Survey code entry works
   - Survey questions load correctly
   - Results are calculated and displayed properly

2. Check browser console for any errors

3. Verify SSL is working:
   - Site should load over HTTPS
   - No mixed content warnings

## Troubleshooting

### Common Issues

1. **Blank Page After Deployment**
   - Check browser console for errors
   - Verify all files were uploaded correctly
   - Check file permissions (should be 644 for files, 755 for directories)

2. **API Calls Failing**
   - Verify Supabase URL and anon key are correct
   - Check if CORS is properly configured in Supabase
   - Ensure SSL is properly set up

3. **SSL Issues**
   - Make sure all resources are loaded over HTTPS
   - Check for any mixed content warnings
   - Verify SSL certificate is properly installed

4. **File Permission Issues**
   - Set correct permissions:
     ```bash
     find . -type f -exec chmod 644 {} \;
     find . -type d -exec chmod 755 {} \;
     ```

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Supabase configuration
3. Check Hostinger's status page for any service issues
4. Contact Hostinger support if the issue persists

## Maintenance

### Regular Updates

1. Keep dependencies updated:
   ```bash
   npm update
   ```

2. Rebuild and redeploy after updates:
   ```bash
   npm run build
   # Then upload to Hostinger
   ```

### Backup

1. Regularly backup your Supabase database
2. Keep a copy of your built files
3. Maintain version control of your source code

## Security Considerations

1. Keep your Supabase credentials secure
2. Regularly update dependencies to patch security vulnerabilities
3. Monitor for any unauthorized access attempts
4. Keep your SSL certificate up to date

## Performance Optimization

1. Enable GZIP compression in Hostinger
2. Use browser caching for static assets
3. Optimize images before deployment
4. Consider using a CDN for better global performance 