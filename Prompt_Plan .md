## **Prompt Plan (All in One Document)**

Below are **full prompts** you can feed to Cursor (or any code-generation LLM). Each prompt stands on its own and continues from where the previous prompt left off. They are presented in code fencing to be copy-pasted directly.

---

### **Prompt 1: Create Basic Project & Environment**

markdown  
CopyEdit  
`You are helping me create a new Vanilla JS project called "FutureLens".` 

`1. Initialise an npm project and create a folder structure:`  
   `- index.html`  
   `- src/`  
     `- app.js`  
     `- auth.js`  
     `- survey.js`  
     `- results.js`  
     `- (optional) test/`  
       `- any_test_files.test.js`  
   `- css/`  
     `- styles.css  (Place all styling here; no inline styles)`

`2. Provide a sample "index.html" that references app.js, auth.js, survey.js, results.js, and includes the stylesheet "css/styles.css". It should also have:`  
   `- A minimal layout for a login form with a passcode field`  
   `- A "root" div for dynamic content`  
   `- No inline styling (use styles.css)`

`3. Add a short sample test in the test/ folder (e.g. using Jest) that confirms we can run a trivial function.`

`4. Provide instructions for how to run these tests.`

---

### **Prompt 2: Supabase Integration & Configuration**

sql  
CopyEdit  
`Now integrate Supabase for user login and data storage.`

`1. Install the @supabase/supabase-js client via npm.`  
`2. In app.js, instantiate a Supabase client using placeholders for URL and anon key:`  
   `const supabase = createClient("YOUR_SUPABASE_URL", "YOUR_SUPABASE_ANON_KEY");`  
`3. Update index.html to ensure the scripts (app.js, auth.js, survey.js, results.js) and css/styles.css are included in a proper order, referencing them from the correct paths.`   
`4. Provide a minimal test that confirms we can call supabase.auth.getSession() (mock or real).`  
`5. Explain how to run this test and verify it passes.`

---

### **Prompt 3: Database Schema & Row-Level Security (Automated Creation Script)**

sql  
CopyEdit  
Please provide a Supabase SQL script (or a JavaScript migration file) that creates the following tables:

1. participants (id, user_id references auth.users (id) not null, cohort_id, survey_id, inserted_at)
2. responses (id, participant_id references participants (id) not null, question_key, likert_value, dont_understand, inserted_at)
3. surveys (id, json_config, inserted_at)
4. cohorts (id, code, label, inserted_at)

Then enable Row-Level Security and create a policy for the "participants" and "responses" table so that a user can only select or insert rows if they match their authenticated user ID. For instance:
- A policy that compares participants.user_id with auth.uid()
- A policy that compares responses.participant_id with participants.id where participants.user_id = auth.uid()

Provide a mock policy snippet if needed.

Next, give me an updated test script that runs these migrations and checks the tables exist and that RLS is enabled.

---

### **Prompt 4: Passcode Auth & Basic Login Flow**

vbnet  
CopyEdit  
`Now let's build basic passcode authentication for the MVP:`

`1. In auth.js, create two functions:` 
   `- signUpUser(email, password): uses supabase.auth.signUp({ email, password }) to register a new user.` 
   `- signInUser(email, password): uses supabase.auth.signInWithPassword({ email, password }) to log in.` 


`2. In index.html, add a simple form for email and password with a "Sign In" button. On submit, call signInUser. Optionally, provide a separate form or toggle for signUpUser if you want to allow user registration from the same page.`  
`3. On successful sign-in, store the returned user session (e.g. access token) in localStorage or a global state variable. On failure, show an appropriate error message.`  
`4. Provide a Jest (or any) test file that:`  
`   - Mocks the Supabase client calls for signUp and signIn.`  
 `  - Verifies success and failure cases (e.g. invalid credentials produce an error).`  
`5. Return the updated index.html, auth.js, and test file(s) demonstrating these functions, making sure no passcode-based logic remains.` 

---

### **Prompt 5: Survey Loading & Question Display**

vbnet  
CopyEdit  
`Extend the code to load a survey's JSON config once the user is authenticated:`

`1. In survey.js, create a function fetchSurvey(surveyId) that queries the surveys table for the JSON config.`  
`2. Create a function initSurvey(surveyJson) that:`  
   `- Extracts required questions from the JSON.`  
   `- Randomly shuffles them (if desired).`  
   `- Stores the order in localStorage under 'questionOrder' or similar.`

`3. Create a function displayNextQuestion() that reads the current question index from localStorage and renders the question in the DOM. Include:`  
   `- Likert scale (+2, +1, -1, -2)`  
   `- "I Don't Understand" checkbox`  
   `- A "Next" button (disabled unless an answer is selected).`

`4. Provide a test that ensures fetchSurvey returns a valid JSON object from the table (mocking the supabase call) and that initSurvey properly stores question order.`

`5. Show the updated survey.js and any relevant changes in index.html.`

---

### **Prompt 6: Capturing Answers & Local Storage (Single Submit)**

sql  
CopyEdit  
`Adjust the answer submission logic to store all responses locally until the user presses a single "Submit" at the end:`

`1. In survey.js, create a function recordAnswer(questionId, likertValue, dontUnderstand) that saves the response in localStorage.`   
   `- Do not sync to Supabase yet.`

`2. Once the user has navigated through all required (and optional, if any) questions, show a "Submit" button that triggers finalSubmission().`

`3. In finalSubmission(), implement the following:`  
   `- Check for internet connection.`  
     `- If there is no connection, show: "no internet connection. Please reconnect and try again"`  
     `- If online, push all locally saved answers to Supabase (responses table) in one go.`  
   `- If successful, show a "Submission Complete" or "Results" screen.`

`4. Provide a test that simulates:`  
   `- Answering multiple questions`  
   `- Pressing submit offline (expect error message)`  
   `- Pressing submit online (expect success)`

`5. Return updated survey.js and relevant pieces in index.html.`

---

### **Prompt 7: Required vs. Optional Questions (No 'Save Now' Button)**

vbnet  
CopyEdit  
`Extend the survey to distinguish between required and optional questions, without any partial "Save Now" option:`

`1. In initSurvey, read the question config from the surveyJson.`   
   `- Some questions have "required: true" or "required: false".`  
   `- Show all required questions first in random order.`   
   `- Then, if there are optional questions, let the user continue or skip them.`

`2. Keep storing all responses locally in localStorage. There's only a single "Submit" at the very end.`

`3. Ensure that users must complete required questions before the Submit button is revealed.`   
   `- Optional questions can be answered or skipped.`

`4. Provide TDD coverage for:`  
   `- Completing all required questions → Submit button appears`  
   `- Skipping optional → Still able to submit`

`5. Return the updated survey.js, referencing how the user flow works in index.html or results.js.`

---

### **Prompt 7a: Multiple Survey Support**

vbnet  
CopyEdit  
`Extend the application to support multiple surveys with survey codes:`

`1. In auth.js, after successful login, add a function showSurveyCodeInput() that:`  
   `- Displays a form with a text input for the survey code`  
   `- Has a "Continue" button that calls loadSurveyByCode(code)`

`2. In survey.js, create the loadSurveyByCode(code) function that:`  
   `- Queries the cohorts table to find the cohort with matching code`  
   `- Gets the associated survey_id from the cohort`  
   `- Queries the surveys table for that survey_id to retrieve the survey configuration`  
   `- Creates a participant record with user_id, cohort_id, and survey_id`  
   `- Calls initSurvey() with the retrieved survey configuration`

`3. Update finalSubmission() in survey.js to:`  
   `- Ensure all response records include the participant_id that links to the right survey`  
   `- Pass the appropriate survey_id to the results page for proper scoring`

`4. In results.js, modify calculateScores(participantId) to:`  
   `- Get the survey_id associated with the participant`  
   `- Apply the correct scoring logic based on the survey configuration`

`5. Write tests that verify:`  
   `- A valid survey code loads the correct survey`  
   `- An invalid survey code shows an appropriate error`  
   `- Responses are correctly associated with the right survey`  
   `- Results calculations use the correct survey configuration`

`Return the updated auth.js, survey.js, results.js files, and describe how the user flow changes to incorporate survey code entry.`

---

### **Prompt 8: Results Page & Scoring**

vbnet  
CopyEdit  
`Now let's calculate and display results:`

`1. In results.js, create a function calculateScores(participantId) that fetches the just-submitted responses from Supabase and computes continuum averages.`   
   `- Each question's likert value can be added or subtracted based on alignment if needed.`  
   `- "I Don't Understand" is recorded but doesn't block scoring.`

`2. Display a summary of each continuum's average.`   
`3. Provide a minimal "Compare with My Group" placeholder if participants have cohorts, or simply show "Coming soon."`  
`4. Write a test that inserts known responses for a participant, calls calculateScores, and checks the average.`

`5. Return the updated results.js and how it's triggered after finalSubmission() is successful.`

---

### **Prompt 9: Session Timeout & Final Checks**

vbnet  
CopyEdit  
`Implement session timeout logic and final verification:`

`1. In auth.js, add a 60-minute inactivity timer. If no clicks/keys, log the user out and prompt them to log in again.`  
`2. If the user is active, call supabase.auth.getSession() periodically to refresh the token.`  
`3. Provide a test that mocks inactivity and verifies forced logout, as well as continuous activity for a valid refresh.`  
`4. Do a final review of the entire codebase:`  
   `- No inline styles (ensure css/styles.css is used).`  
   `- RLS is enforced (users only see their own data).`  
   `- Single final submission approach (no partial sync).`  
   `- No leftover references to partial offline submission or "Save Now" button.`  
   `- Working scoring logic, results screen.`

`5. Provide the final integrated code and instructions for deploying to a static hosting environment with Supabase as the backend.`

---

### **Prompt 10: Redirect to Results After Login for Completed Surveys**

vbnet  
CopyEdit  
`Enhance the application to redirect users to their results page when they login if they've already completed a survey:`

`1. In auth.js, modify the handleLogin function to:`  
   `- After successful authentication but before redirecting to survey-code.html`  
   `- Add an async function checkCompletedSurveys(userId) that:`  
     `- Uses the user's ID to query the participants table with proper RLS considerations`  
     `- Joins with the responses table to determine if the user has any completed surveys`  
     `- Define "completed" as having responses for all required questions in a survey`  
     `- Handle the case where no participants records exist without error`

`2. Add a user selection screen when multiple completed surveys exist:`  
   `- If only one completed survey, redirect directly to results.html with the appropriate participant_id`  
   `- If multiple completed surveys, display a selection screen showing survey titles and dates`  
   `- Allow users to choose which results to view or to start a new survey`

`3. Standardize participant ID storage:`  
   `- Ensure consistent use of either 'participant_id' or 'futurelens_participant_id' in localStorage` 
   `- Update all references throughout the codebase to use the standardized key`  
   `- Document this decision in code comments for future developers`

`4. Optimize database queries and respect RLS:`  
   `- Ensure all queries work within existing RLS policies`  
   `- Use efficient query patterns that don't degrade login performance`  
   `- Include proper error handling for cases where RLS might block access`

`5. Update the results.js module to:`  
   `- Accept participant_id as a URL parameter (e.g., results.html?participant_id=123)`  
   `- Gracefully handle cases where results might be incomplete`  
   `- Add clear navigation options to return to the survey selection or take a new survey`

`6. Ensure compatibility with the existing session timeout mechanism:`  
   `- Make sure the new flows respect the 60-minute inactivity timer`  
   `- Maintain proper token refresh during redirects and result viewing`  
   `- Test thoroughly with various timeout scenarios`

`Write tests that verify:`  
   `- Users with completed surveys are correctly redirected`  
   `- Users with no completed surveys follow the original flow`  
   `- The selection screen works correctly for users with multiple surveys`  
   `- All functionality respects the RLS constraints in the database`

`Return the updated auth.js, app.js, and results.js files, focusing on making this feature resilient to the identified potential issues.`

---

### **Prompt 10a: Comprehensive Row Level Security Implementation and Testing**

vbnet  
CopyEdit  
`Implement a comprehensive solution for the Row Level Security (RLS) vulnerabilities in the Supabase backend, focusing on backward compatibility and practical implementation:`

`1. Perform a complete database operations inventory:` 
   `- Audit all Supabase queries in the codebase (src/auth.js, src/survey.js, src/results.js, etc.)` 
   `- Map each query to its access pattern (anonymous, authenticated, admin)` 
   `- Document which operations might be affected by enabling RLS on the surveys table` 
   `- Create a compatibility risk assessment for each identified query`

`2. Harmonize migration files to resolve inconsistencies:` 
   `- Compare all SQL migration files (migrations.sql, src/migrations/*.sql)` 
   `- Create a consolidated migration that resolves contradictory RLS configurations` 
   `- Ensure all tables have consistent RLS settings and policies` 
   `- Pay special attention to the surveys table where policies exist but RLS is not enabled`
   `- Document differences between intended and actual security model`

`3. Design a phased implementation approach:` 
   `- Create a staging environment for testing security changes` 
   `- Implement backend changes in this order:` 
     `a) Enable RLS on surveys table without modifying existing policies` 
     `b) Verify and enhance existing policies if needed` 
     `c) Test backward compatibility with application code` 
     `d) Add admin access policies as needed` 
   `- Provide clear rollback commands for each phase`

`4. Enhance frontend code to handle security-related responses:` 
   `- Modify all components that query the surveys table to handle RLS-related rejections` 
   `- Create user-friendly error messages for access denied scenarios` 
   `- Implement proper error handling that distinguishes between network issues and permission issues` 
   `- Add debugging options that can be toggled in development environments`

`5. Implement specific patterns for RLS-compliant queries:` 
   `- Create helper functions for common query patterns that work with RLS` 
   `- Demonstrate how to modify existing queries that might break with RLS enabled` 
   `- Provide examples for each of these query types:` 
     `a) Basic CRUD operations from authenticated contexts` 
     `b) Aggregate operations that need to span user boundaries` 
     `c) Admin-level operations that need to bypass RLS` 
     `d) Anonymous access patterns for public resources`

`6. Develop a comprehensive testing suite:` 
   `- Create test users with different roles (anonymous, regular user, admin)` 
   `- Implement tests based on actual application usage patterns, including:` 
     `a) Survey access by anonymous vs. authenticated users` 
     `b) Survey creation/modification by different user types` 
     `c) Cross-user data access scenarios` 
     `d) Authentication state transitions` 
   `- Add performance comparison tests (before/after RLS)` 
   `- Include specific test cases for each identified high-risk query`

`7. Add database monitoring for security and performance:` 
   `- Implement query logging for security-sensitive operations` 
   `- Create a performance monitoring solution to identify RLS-related slowdowns` 
   `- Develop optimization strategies for common RLS performance issues` 
   `- Add alerting for unusual access patterns that might indicate security issues`

`8. Create comprehensive documentation:` 
   `- Document the security model with clear examples` 
   `- Create a matrix showing access patterns for each user role and resource type` 
   `- Provide guidelines for developers on adding new features with RLS considerations` 
   `- Include troubleshooting guides for common RLS-related issues` 
   `- Document any performance implications and mitigation strategies`

`Deliver the following as part of this implementation:` 
`- A consolidated migration file that properly enables RLS on the surveys table` 
`- Updated application code that maintains functionality with RLS enabled` 
`- A comprehensive test suite demonstrating RLS enforcement` 
`- Documentation of the security model and implementation details` 
`- Performance analysis comparing before/after RLS implementation` 
`- Instructions for rollback if needed`

---

### **Prompt 10b: Securing Database Functions Against Search Path Vulnerabilities**

```
Implement a graduated approach to address the function_search_path_mutable warnings in the FutureLens application, with careful consideration for backward compatibility and existing functionality:

## 1. Analysis and Discovery
   - Analyze the current implementation of both affected functions (`exec_sql` and `check_tables_exist`):
     ```sql
     SELECT routine_definition, security_type 
     FROM information_schema.routines 
     WHERE routine_schema = 'public' 
     AND routine_name IN ('exec_sql', 'check_tables_exist');
     ```
   - Identify all places in the codebase where these functions are called
   - Document their current parameters, return types, and usage patterns
   - Determine whether these functions access schemas other than 'public'

## 2. Security Remediation Options
   Provide three levels of remediation for the client to choose from:

   ### Option A: Minimal Fix (Preserve All Functionality)
   - Update both functions to use a fixed search path:
     ```sql
     CREATE OR REPLACE FUNCTION exec_sql(sql text)
     RETURNS void
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path = public
     AS $$
     BEGIN
       EXECUTE sql;
     END;
     $$;
     ```

   ### Option B: Enhanced Security with Auditing
   - Implement Option A plus:
   - Add logging to track all executions of these powerful functions:
     ```sql
     CREATE TABLE IF NOT EXISTS security_audit_log (
       id SERIAL PRIMARY KEY,
       function_name TEXT NOT NULL,
       parameters JSONB,
       user_id UUID DEFAULT auth.uid(),
       execution_time TIMESTAMP DEFAULT NOW()
     );
     
     CREATE OR REPLACE FUNCTION exec_sql(sql text)
     RETURNS void
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path = public
     AS $$
     BEGIN
       INSERT INTO security_audit_log(function_name, parameters)
       VALUES ('exec_sql', jsonb_build_object('sql_hash', md5(sql)));
       
       EXECUTE sql;
     END;
     $$;
     ```

   ### Option C: Maximum Security (Functional Redesign)
   - Replace `exec_sql` with purpose-specific functions for each required operation
   - Create a migration path that identifies all current uses and creates safer alternatives
   - Provide specific functions for common operations (e.g., `enable_rls_on_table(table_name text)`)
   - Eventually deprecate the general-purpose function

## 3. Implementation with Safety Checks
   - Create scripts that apply each option with validations:
     - Backup current function definitions before applying changes
     - Verify functions still exist after changes
     - Test function execution with simple test cases
     - Add rollback capability if changes cause issues
   - Add these as npm scripts:
     ```json
     "fix:search-path:analyze": "node scripts/analyze-functions.js",
     "fix:search-path:minimal": "node scripts/fix-search-path-minimal.js",
     "fix:search-path:enhanced": "node scripts/fix-search-path-enhanced.js",
     "fix:search-path:rollback": "node scripts/rollback-function-changes.js"
     ```

## 4. Comprehensive Documentation
   - Document each function's purpose, permissions, and potential risks
   - Create developer guidelines for when and how to use these powerful functions
   - Add explicit warnings in both function code comments and documentation about security implications
   - Document the decision-making process for which security option was chosen and why

## 5. Verification
   - Provide specific SQL queries to verify changes were applied correctly:
     ```sql
     SELECT routine_name, routine_schema, 
            routine_definition, security_type,
            (SELECT setting FROM pg_settings WHERE name = 'search_path') as current_search_path
     FROM information_schema.routines 
     WHERE routine_schema = 'public' 
     AND routine_name IN ('exec_sql', 'check_tables_exist');
     ```
   - Test real application workflows that use these functions
   - Monitor for any regressions or unexpected behavior

## 6. Future-Proofing
   - Add a linting rule or CI check to prevent future functions from being created without fixed search paths
   - Create guidelines for secure function creation in the project
   - If using Option A or B, plan for eventual migration to Option C as a long-term security goal

Deliver a complete package that addresses the security vulnerabilities while respecting the existing application architecture. Ensure all changes are fully documented, tested, and include rollback procedures.
```

---

## **Post-MVP Features**

Below is the same expansion roadmap as before, which you can tackle **after** delivering a stable MVP. These are not prompted in detail, just keep them in mind:

* **Admin Panel (`/admin`)**

* **Detailed Group Comparison**

* **Reflection Prompts**

* **Teacher-Facing Dashboard**

* **Role-Based Access**

* **Printable/PDF Results**

* **Gamified Completion Badges**

* **Multi-Language Support**

* **CSV Upload of Participants & Cohorts**

* **Cohort Expiry Management**

* **Analytics Dashboard**

* **Cross-Cohort Comparison Tool**

