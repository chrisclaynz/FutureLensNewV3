# FutureLens

A Vanilla JS project for survey management with Supabase backend.

## Features

- Email-based authentication
- Survey code entry for participation
- Randomized question delivery
- Required vs. optional questions
- Offline data collection with single final submission
- Results visualization with score analysis
- 60-minute session timeout for security
- Database backup and restore functionality

## Tech Stack

- Vanilla JavaScript
- HTML/CSS
- Supabase for authentication and data storage
- Vite for local development and building

## Project Structure

```
.
├── css/               # Stylesheets
├── src/               # Source code
│   ├── app.js         # Main application code
│   ├── auth.js        # Authentication functionality
│   ├── client.js      # Supabase client
│   ├── survey.js      # Survey functionality
│   └── results.js     # Results computation and display
├── test/              # Unit tests
├── index.html         # Login page
├── survey-code.html   # Survey code entry
├── survey-welcome.html# Survey welcome
├── survey.html        # Survey questions
└── results.html       # Results page
```

## Deployment Instructions

### Prerequisites
- Node.js and npm installed
- A Supabase account and project

### Environment Setup
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
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
4. Update `src/config.js` to use these environment variables.

### Database Setup
1. Run the database migrations to create tables and enable Row Level Security (RLS):
   ```bash
   npm run migrate
   ```
   This will execute the SQL scripts in `src/migrations/` to set up your Supabase database.

### Building the Frontend
1. Build the project:
   ```bash
   npm run build
   ```
   This will generate static files in the `dist/` directory.

### Deploying the Frontend
#### Option 1: Deploy to Vercel
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Deploy:
   ```bash
   vercel
   ```
   Follow the prompts to link your project and deploy.

#### Option 2: Deploy to Netlify
1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
2. Deploy:
   ```bash
   netlify deploy
   ```
   Follow the prompts to link your project and deploy.

#### Option 3: Deploy to GitHub Pages
1. Push your `dist/` directory to a GitHub repository.
2. Go to your repository settings, navigate to "GitHub Pages", and select the branch to deploy.

### Running Tests
Run the test suite:
```bash
npm test
```
This will execute Jest tests located in the `test/` directory.

### Additional Notes
- Ensure your Supabase project has the correct RLS policies enabled.
- For local development, use a local server (e.g., `npm run dev`).
- For production, ensure all environment variables are set correctly.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

## Database Backup and Restore

The project includes scripts for backing up and restoring your Supabase database. These scripts create CSV backups of all tables and provide functionality to restore the data if needed.

### Prerequisites
- Node.js and npm installed
- Supabase project with service role key

### Environment Setup
1. Create a `.env` file in the root directory with your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   Note: The service role key is required for backup/restore operations.

### Creating a Backup
To create a backup of all database tables:
```bash
npm run backup
```
This will:
- Create a `backups` directory if it doesn't exist
- Export each table to a separate CSV file
- Name files with timestamps (e.g., `profiles_backup_2024-03-21T12-34-56.csv`)
- Handle special characters and formatting in the CSV files

The backup files are stored in the `backups` directory and are excluded from git for security.

### Restoring from Backup
To restore all tables from their most recent backups:
```bash
npm run restore
```

To restore a specific backup file:
```bash
npm run restore:table backups/profiles_backup_2024-03-21T12-34-56.csv
```

The restore process:
- Reads the backup CSV files
- Validates the data
- Restores tables in the correct order
- Provides progress updates
- Handles errors gracefully

### Backup Files
The backup process creates CSV files for the following tables:
- profiles
- participants
- surveys
- responses
- cohorts

### Security Notes
- Backup files contain sensitive data and are excluded from git
- Keep your service role key secure
- Store backup files in a secure location
- Consider encrypting backup files for additional security

## License

This project is licensed under the MIT License. 