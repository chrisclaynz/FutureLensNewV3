import { defineConfig } from 'vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  server: {
    port: 3000,
  },
  define: {
    'process.env': {
      VITE_SUPABASE_URL: JSON.stringify(process.env.VITE_SUPABASE_URL),
      VITE_SUPABASE_ANON_KEY: JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    },
  },
  build: {
    outDir: 'dist3',
    rollupOptions: {
      input: {
        main: 'index.html',
        home: 'home.html',
        createAccount: 'create-account.html',
        surveyCode: 'survey-code.html',
        surveyWelcome: 'survey-welcome.html',
        survey: 'survey.html',
        results: 'results.html',
        admin: 'admin.html',
        teacherRegister: 'teacher-register.html',
        runMigrations: 'run_migrations.html',
        getSurveyId: 'get-survey-id.html',
        createTestSurveys: 'create-test-surveys.html',
        dbTest: 'db-test.html'
      }
    }
  }
}); 