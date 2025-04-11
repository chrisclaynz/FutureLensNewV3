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
`Please provide a Supabase SQL script (or a JavaScript migration file) that creates the following tables:`

`1. participants (id, passcode unique, cohort_id, survey_id, inserted_at)`  
`2. responses (id, participant_id, question_key, likert_value, dont_understand, inserted_at)`  
`3. surveys (id, json_config, inserted_at)`  
`4. cohorts (id, code, label, inserted_at)`

`Then enable Row-Level Security and create a policy for the "participants" and "responses" table so that a user can only select or insert rows if they match their authenticated user ID or passcode logic. Provide a mock policy if needed.`

`Next, give me an updated test script that runs these migrations and checks the tables exist.`

---

### **Prompt 4: Passcode Auth & Basic Login Flow**

vbnet  
CopyEdit  
`Now let's build basic passcode authentication for the MVP:`

`1. In auth.js, create a function handleLogin(passcode) that:`  
   `- Normalises the passcode (e.g. lower/upper).`  
   `- Queries Supabase to validate it in the participants table.`  
   `- On success, store the participant_id or passcode in localStorage or a global variable.`  
   `- On failure, show an error message.`

`2. Update index.html to have a simple login form that calls handleLogin on submit.`  
`3. Provide a Jest (or any) test that mocks a Supabase call and verifies handleLogin handles success/failure.`  
`4. Return the updated index.html, auth.js, and test file.`

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
   `- “I Don’t Understand” checkbox`  
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

### **Prompt 7: Required vs. Optional Questions (No ‘Save Now’ Button)**

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

### **Prompt 8: Results Page & Scoring**

vbnet  
CopyEdit  
`Now let's calculate and display results:`

`1. In results.js, create a function calculateScores(participantId) that fetches the just-submitted responses from Supabase and computes continuum averages.`   
   `- Each question's likert value can be added or subtracted based on alignment if needed.`  
   `- "I Don’t Understand" is recorded but doesn't block scoring.`

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
   `- No leftover references to partial offline submission or “Save Now” button.`  
   `- Working scoring logic, results screen.`

`5. Provide the final integrated code and instructions for deploying to a static hosting environment with Supabase as the backend.`

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

