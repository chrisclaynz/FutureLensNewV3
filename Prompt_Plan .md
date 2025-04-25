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

