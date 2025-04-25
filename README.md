# FutureLens

A web-based survey application that helps users understand their cognitive preferences and thinking patterns.

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

1. A Supabase account (https://supabase.com)
2. A static hosting service (Netlify, Vercel, Firebase Hosting, GitHub Pages, etc.)

### Setting Up Supabase

1. Create a new Supabase project
2. Run the SQL migrations in `/migrations.sql` on your Supabase database
3. Configure Row-Level Security (RLS) policies for the tables
4. Enable email authentication in Supabase Auth settings

### Environment Variables

Create a `.env` file with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Building for Production

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. The built files will be in the `dist` directory.

### Deploying to a Static Hosting Service

#### Netlify

1. Create a `netlify.toml` file in the project root:
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. Deploy using the Netlify CLI:
   ```bash
   npx netlify deploy --prod
   ```

#### Vercel

1. Create a `vercel.json` file in the project root:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

2. Deploy using Vercel CLI:
   ```bash
   npx vercel --prod
   ```

#### Firebase Hosting

1. Initialize Firebase:
   ```bash
   firebase init hosting
   ```

2. Deploy to Firebase:
   ```bash
   firebase deploy --only hosting
   ```

### Post-Deployment Setup

1. Set up a survey in the Supabase `surveys` table using the JSON format
2. Create a cohort in the `cohorts` table and link it to the survey
3. Share the cohort code with participants

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

## Testing

Run unit tests:
```bash
npm test
```

## License

This project is licensed under the MIT License. 