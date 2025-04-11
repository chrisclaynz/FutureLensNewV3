# **FutureLens To-Do Checklist**

## **MVP: Core Tasks**

### **Prompt 1: Create Basic Project & Environment**

* **Project Initialisation**

  * Create an npm project named `FutureLens`.

  * Create folder structure:

    * `index.html`

    * `src/`

      * `app.js`

      * `auth.js`

      * `survey.js`

      * `results.js`

      * (optional) `test/`

        * `any_test_files.test.js`

    * `css/`

      * `styles.css` (All styling goes here; **no inline styles**).

  * Add a minimal login form and a `root` div in `index.html`.

* **Sample Test**

  * In `test/` folder, create a basic test (e.g. Jest) to confirm environment is working.

  * Document how to run these tests (e.g. `npm test`).

### **Prompt 2: Supabase Integration & Configuration**

* **Supabase Client**

  * Install `@supabase/supabase-js`.

In `app.js`, instantiate the client with your Supabase URL and anon key:

 js  
CopyEdit  
`const supabase = createClient("YOUR_SUPABASE_URL", "YOUR_SUPABASE_ANON_KEY");`

*   
  * Ensure `index.html` references `app.js`, `auth.js`, `survey.js`, `results.js`, and `css/styles.css` in the correct order.

* **Test Connectivity**

  * Write a minimal test that calls `supabase.auth.getSession()` (mock or real).

  * Explain how to verify it passes.

### **Prompt 3: Database Schema & Row-Level Security (Automated Creation Script)**

* **Create Tables** (using SQL script or migration):

  * `participants(id, passcode unique, cohort_id, survey_id, inserted_at)`

  * `responses(id, participant_id, question_key, likert_value, dont_understand, inserted_at)`

  * `surveys(id, json_config, inserted_at)`

  * `cohorts(id, code, label, inserted_at)`

* **RLS & Policies**

  * Enable RLS for `participants` and `responses`.

  * Ensure a policy that restricts data access to the user’s own rows (via passcode matching or similar).

* **Table Existence Test**

  * Run a script/test to confirm the tables exist.

  * Verify RLS policies are set correctly.

### **Prompt 4: Passcode Auth & Basic Login Flow**

* **Login Form & `auth.js`**

  * In `auth.js`, create `handleLogin(passcode)`:

    * Normalise case.

    * Query `participants` to verify passcode.

    * On success, store `participant_id` or passcode in local storage or a global variable.

    * On failure, show an error message.

* **Integration**

  * In `index.html`, have a simple login form (field for passcode \+ a “Login” button).

  * On submit, call `handleLogin`.

* **Auth Tests**

  * Mock the Supabase call in a test.

  * Verify correct passcode → success, incorrect → failure.

### **Prompt 5: Survey Loading & Question Display**

* **Fetch Survey**

  * In `survey.js`, create `fetchSurvey(surveyId)` that fetches `surveys.json_config` from Supabase.

  * Ensure it returns a valid JSON object of questions.

* **initSurvey**

  * `initSurvey(surveyJson)`:

    * Read question list (e.g. array in `json_config`).

    * Shuffle them if desired.

    * Store the order in localStorage as `questionOrder`.

* **Display Next Question**

  * `displayNextQuestion()` uses `questionOrder` and a current index to render:

    * The question text.

    * Likert scale (+2, \+1, \-1, \-2).

    * “I Don’t Understand” checkbox.

    * A “Next” button (disabled unless an answer is selected).

* **Survey Tests**

  * Mock `fetchSurvey`.

  * Confirm the random order is stored.

  * Verify that question data is displayed.

### **Prompt 6: Capturing Answers & Local Storage (Single Submit)**

* **Local Storage Only**

  * In `survey.js`, `recordAnswer(questionId, likertValue, dontUnderstand)`:

    * Store the response in localStorage.

    * **Do not** sync to Supabase at this stage.

* **Final Submission**

  * A single “Submit” button (after all questions) triggers `finalSubmission()`:

    * Checks internet connection.

      * If offline, show error: **"no internet connection. Please reconnect and try again"**.

      * If online, push all locally saved answers to Supabase in one go.

    * On success, show a “Submission Complete” or transition to results.

* **Tests**

  * Simulate offline submission (expect error).

  * Simulate online submission (expect success).

  * Verify all answers are uploaded in one final batch.

### **Prompt 7: Required vs. Optional Questions (No ‘Save Now’ Button)**

* **Survey JSON**

  * Distinguish `required: true` vs. `required: false`.

* **Flow**

  * Show all required questions first; user cannot submit until these are done.

  * Let user proceed to optional questions if they wish, but do not provide any partial “save now” option.

  * Only a single final “Submit” at the end for all responses.

* **Testing**

  * Confirm required questions are forced before results.

  * Optional can be skipped, still able to submit everything in one go.

### **Prompt 8: Results Page & Scoring**

* **`results.js`: calculateScores**

  * After finalSubmission, fetch user’s newly inserted responses from Supabase.

  * Compute averages for each continuum or question group (taking alignment into account if needed).

  * “I Don’t Understand” remains recorded but doesn’t block scoring.

* **Display**

  * Show each continuum’s average or summary.

  * Optionally display a placeholder for group comparison.

* **Tests**

  * Insert known data → confirm correct average calculation.

### **Prompt 9: Session Timeout & Final Checks**

* **Session Timeout**

  * In `auth.js`, add a 60-minute inactivity timer.

  * If no activity, prompt user to log in again.

  * If active, call `supabase.auth.getSession()` to refresh.

* **Final Review**

  * **No inline styles**; confirm all styling is in `css/styles.css`.

  * **Single final submission** approach only; no partial sync.

  * Check RLS to ensure data privacy.

  * Confirm scoring works with required and optional questions.

* **Deployment**

  * Provide final instructions for hosting on a static environment with Supabase.

---

## **Post-MVP Features**

Consider these enhancements after you have a stable MVP:

1. **Admin Panel (/admin)**

   * Restrict by admin role in Supabase.

   * View cohort-level analytics.

2. **Detailed Group Comparison**

   * Show distribution data or outlier analysis.

3. **Reflection Prompts**

   * Free-text fields on results page.

4. **Teacher-Facing Dashboard**

   * Display more advanced charts and data filters.

5. **Role-Based Access**

   * Distinguish “admin” vs. “teacher” in Supabase roles/policies.

6. **Printable/PDF Results**

   * Let users print or export results.

7. **Gamified Completion Badges**

   * Provide badges for finishing optional questions or other milestones.

8. **Multi-Language Support**

   * Externalise text into JSON or resource files.

9. **CSV Upload of Participants & Cohorts**

   * Bulk creation of passcodes/cohorts.

10. **Cohort Expiry Management**

    * Deactivate older cohorts.

11. **Analytics Dashboard**

    * Advanced usage metrics, device breakdown, etc.

12. **Cross-Cohort Comparison Tool**

    * Compare data across multiple cohorts.

