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

## License

This project is licensed under the MIT License. 