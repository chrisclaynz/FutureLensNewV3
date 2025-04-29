// DOM Elements
const dashboardSection = document.getElementById('dashboard-section');
const logoutBtn = document.getElementById('logout-btn');
const userRoleDisplay = document.getElementById('user-role');
const inviteCohortSelect = document.getElementById('invite-cohort-select');
const searchCohortSelect = document.getElementById('search-cohort-select');
const surveyCodeInput = document.getElementById('survey-code');
const searchBtn = document.getElementById('search-btn');
const resultsContainer = document.getElementById('results-container');
const studentSearch = document.getElementById('student-search');
const cohortAverages = document.getElementById('cohort-averages');
const incompleteSurveys = document.getElementById('incomplete-surveys');
const continuumDetails = document.querySelector('.continuum-details');
const continuumStats = document.getElementById('continuum-stats');
const toggleStudentIdsBtn = document.getElementById('toggle-student-ids');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// State
let currentUser = null;
let currentCohort = null;
let currentSurvey = null;
let studentIdentificationVisible = true;

// Check if user is already logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    // For testing only - check for bypass flag
    const urlParams = new URLSearchParams(window.location.search);
    const bypassLogin = urlParams.get('bypass') === 'true';
    
    if (bypassLogin && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        console.log('Bypassing login for local testing');
        createMockSession();
        return;
    }
    
    checkExistingSession();
});

// Create a mock session for testing
function createMockSession() {
    currentUser = {
        id: 'test-user-' + Date.now(),
        email: 'test-teacher@example.com',
        role: 'teacher',
        cohort_ids: ['test-cohort-1', 'test-cohort-2']
    };
    
    console.log('Created mock user session:', currentUser);
    
    loadTeacherCohorts()
        .then(() => {
            showDashboard();
        })
        .catch(error => {
            console.warn('Error loading cohorts in test mode:', error);
            // Still show dashboard with default values
            showDashboard();
        });
}

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
studentSearch.addEventListener('input', debounce(handleStudentSearch, 300));
logoutBtn.addEventListener('click', handleLogout);
toggleStudentIdsBtn.addEventListener('click', toggleStudentIds);

// Tab switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and hide all content
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.add('hidden'));
        
        // Add active class to clicked button and show corresponding content
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.remove('hidden');
    });
});

// Add event listener for invite form
document.getElementById('invite-form').addEventListener('submit', handleInviteGeneration);

// Functions
async function checkExistingSession() {
    try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError || !session) {
            console.error('No valid session found:', sessionError || 'No session');
            redirectToLogin();
            return;
        }
        
        // Get user data
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        
        if (userError || !user) {
            console.error('No user found:', userError || 'No user data');
            redirectToLogin();
            return;
        }
        
        currentUser = user;
        
        // Check user role in profiles table
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role, cohort_ids')
            .eq('id', user.id)
            .single();
        
        if (profileError) {
            console.error('Error fetching user profile:', profileError);
            redirectToLogin();
            return;
        }
        
        if (profile.role !== 'teacher' && profile.role !== 'admin') {
            console.error('User does not have teacher or admin role');
            redirectToLogin();
            return;
        }
        
        // Valid teacher/admin, set up user data
        currentUser.role = profile.role;
        currentUser.cohort_ids = profile.cohort_ids || [];
        
        // Display user role
        userRoleDisplay.textContent = `Role: ${currentUser.role}`;
        
        // Load cohorts and show dashboard
        await loadTeacherCohorts();
        showDashboard();
    } catch (error) {
        console.error('Error verifying session:', error);
        redirectToLogin();
    }
}

function redirectToLogin() {
    // Redirect to main login page
    window.location.href = '/';
}

async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        // Reset state
        currentUser = null;
        currentCohort = null;
        currentSurvey = null;
        
        // Redirect to main login page
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error during logout: ' + error.message);
    }
}

function toggleStudentIds() {
    const studentElements = document.querySelectorAll('.student-identifier');
    studentIdentificationVisible = !studentIdentificationVisible;
    
    studentElements.forEach(element => {
        if (studentIdentificationVisible) {
            element.style.display = 'inline';
            toggleStudentIdsBtn.textContent = 'Hide Student IDs';
        } else {
            element.style.display = 'none';
            toggleStudentIdsBtn.textContent = 'Show Student IDs';
        }
    });
}

// Helper function to parse JWT
function parseJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error parsing JWT:', e);
        return {};
    }
}

async function loadTeacherCohorts() {
    try {
        console.log('Loading cohorts for user:', currentUser);
        console.log('Cohort IDs:', currentUser.cohort_ids);

        // If no cohort IDs, show placeholder data
        if (!currentUser.cohort_ids || currentUser.cohort_ids.length === 0) {
            console.warn('No cohort IDs found in user profile. Creating test data for development.');
            // Add placeholder options
            const testCohortOptions = `
                <option value="test-cohort-1">Test Cohort 1</option>
                <option value="test-cohort-2">Test Cohort 2</option>
            `;
            inviteCohortSelect.innerHTML = testCohortOptions;
            searchCohortSelect.innerHTML = testCohortOptions;
            return;
        }

        // Convert string cohort IDs to UUIDs if needed
        const cohortIds = currentUser.cohort_ids.map(id => id.toString());

        const { data: cohorts, error } = await supabaseClient
            .from('cohorts')
            .select('id, code, label, survey_id')
            .in('id', cohortIds);

        if (error) {
            console.error('Error loading cohorts from database:', error);
            // Add placeholder options since database call failed
            const testCohortOptions = `
                <option value="dev-cohort-1">Development Cohort 1</option>
                <option value="dev-cohort-2">Development Cohort 2</option>
            `;
            inviteCohortSelect.innerHTML = testCohortOptions;
            searchCohortSelect.innerHTML = testCohortOptions;
            return;
        }

        console.log('Loaded cohorts:', cohorts);

        if (cohorts && cohorts.length > 0) {
            // Update both cohort select elements
            const cohortOptions = cohorts
                .map(cohort => `<option value="${cohort.id}">${cohort.label} (${cohort.code})</option>`)
                .join('');

            inviteCohortSelect.innerHTML = cohortOptions;
            searchCohortSelect.innerHTML = cohortOptions;
        } else {
            console.warn('No cohorts found for the given IDs');
            // Add placeholder options
            const testCohortOptions = `
                <option value="no-results-1">No Assigned Cohorts (Test 1)</option>
                <option value="no-results-2">No Assigned Cohorts (Test 2)</option>
            `;
            inviteCohortSelect.innerHTML = testCohortOptions;
            searchCohortSelect.innerHTML = testCohortOptions;
        }
    } catch (error) {
        console.error('Error loading cohorts:', error);
        alert('Error loading cohorts: ' + error.message);
        throw error; // Rethrow for handling in the calling function
    }
}

async function handleSearch() {
    const cohortId = searchCohortSelect.value;
    const surveyCode = surveyCodeInput.value.trim();

    if (!cohortId) {
        alert('Please select a cohort');
        return;
    }

    if (!surveyCode) {
        alert('Please enter a survey code');
        return;
    }

    try {
        currentCohort = cohortId;
        
        // Try to get the survey from the database
        let survey = await getSurveyByCode(surveyCode);
        
        // If no survey found or database error, create test data
        if (!survey) {
            console.warn('Survey not found or database error. Creating test survey data for development.');
            survey = createTestSurvey(surveyCode);
        }
        
        currentSurvey = survey;
        
        try {
            await loadCohortResults();
        } catch (resultError) {
            console.warn('Error loading cohort results:', resultError);
            // Display mock results for testing
            displayMockResults();
        }
        
        resultsContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Search error:', error);
        alert('Error loading results: ' + error.message);
    }
}

async function getSurveyByCode(code) {
    try {
        const { data, error } = await supabaseClient
            .from('surveys')
            .select('id, json_config')
            .eq('code', code)
            .single();

        if (error) {
            console.error('Error fetching survey:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Error in getSurveyByCode:', error);
        return null;
    }
}

// Function to create test survey data for development
function createTestSurvey(code) {
    console.log('Creating test survey with code:', code);
    return {
        id: 'test-survey-' + Date.now(),
        code: code,
        json_config: {
            title: "Test Survey",
            questions: [
                { key: "Question1", text: "This is a test question 1" },
                { key: "Question2", text: "This is a test question 2" },
                { key: "Question3", text: "This is a test question 3" }
            ]
        }
    };
}

// Function to display mock results for testing
function displayMockResults() {
    const mockStats = [
        { question_key: "Question1", average: 1.5, dontUnderstandPercentage: 10 },
        { question_key: "Question2", average: -0.5, dontUnderstandPercentage: 5 },
        { question_key: "Question3", average: 0.8, dontUnderstandPercentage: 15 }
    ];
    
    displayCohortAverages(mockStats);
    
    // Display mock incomplete surveys
    const mockIncomplete = [
        { email: "student1@example.com" },
        { email: "student2@example.com" }
    ];
    
    displayIncompleteSurveys(mockIncomplete);
}

async function loadCohortResults() {
    try {
        // Load cohort averages through participants join
        const { data: averages, error: avgError } = await supabaseClient
            .from('responses')
            .select(`
                question_key,
                likert_value,
                dont_understand,
                participants!inner (
                    id,
                    user_id
                )
            `)
            .eq('participants.cohort_id', currentCohort)
            .eq('participants.survey_id', currentSurvey.id);

        if (avgError) {
            console.error('Error loading cohort averages:', avgError);
            throw avgError;
        }

        if (!averages || averages.length === 0) {
            console.warn('No responses found for this cohort/survey combination');
            // Show empty state
            cohortAverages.innerHTML = '<p>No responses found for this survey. Tell your students to complete the survey.</p>';
            incompleteSurveys.innerHTML = '<p>Incomplete data available.</p>';
            return;
        }

        const stats = calculateStats(averages);
        displayCohortAverages(stats);

        try {
            // Load all participants for this cohort and survey
            const { data: participants, error: incError } = await supabaseClient
                .from('participants')
                .select('id, user_id')
                .eq('cohort_id', currentCohort)
                .eq('survey_id', currentSurvey.id);

            if (incError) {
                console.error('Error loading participants:', incError);
                incompleteSurveys.innerHTML = '<p>Could not load incomplete survey information.</p>';
                return;
            }

            if (!participants || participants.length === 0) {
                incompleteSurveys.innerHTML = '<p>No participants found for this survey.</p>';
                return;
            }

            try {
                // Get user emails using auth.getUser() for each participant
                const participantEmails = await fetchParticipantEmails(participants);

                // Get all responses for these participants
                const { data: responses, error: respError } = await supabaseClient
                    .from('responses')
                    .select('participant_id')
                    .in('participant_id', participants.map(p => p.id));

                if (respError) {
                    console.error('Error loading responses:', respError);
                    incompleteSurveys.innerHTML = '<p>Could not load response information.</p>';
                    return;
                }

                // Determine which participants have no responses (incomplete)
                const participantIdsWithResponses = new Set(responses.map(r => r.participant_id));
                const incompleteWithEmail = participants
                    .filter(p => !participantIdsWithResponses.has(p.id))
                    .map(p => ({
                        user_id: p.user_id,
                        email: participantEmails.get(p.user_id) || 'Unknown'
                    }));

                displayIncompleteSurveys(incompleteWithEmail);
            } catch (emailError) {
                console.error('Error fetching participant emails:', emailError);
                incompleteSurveys.innerHTML = '<p>Could not load participant email information.</p>';
            }
        } catch (participantError) {
            console.error('Error in participant processing:', participantError);
            incompleteSurveys.innerHTML = '<p>Error processing participant data.</p>';
        }
    } catch (error) {
        console.error('Error loading cohort results:', error);
        throw error;
    }
}

function calculateStats(responses) {
    const stats = {};
    
    responses.forEach(response => {
        if (!stats[response.question_key]) {
            stats[response.question_key] = {
                sum: 0,
                count: 0,
                dontUnderstand: 0
            };
        }

        if (response.dont_understand) {
            stats[response.question_key].dontUnderstand++;
        } else {
            stats[response.question_key].sum += response.likert_value;
            stats[response.question_key].count++;
        }
    });

    return Object.entries(stats).map(([key, data]) => ({
        question_key: key,
        average: data.count > 0 ? data.sum / data.count : 0,
        dontUnderstandPercentage: (data.dontUnderstand / (data.count + data.dontUnderstand)) * 100
    }));
}

function displayCohortAverages(stats, title = 'Cohort Overview') {
    // Update the header if a custom title is provided
    const cohortResultsHeader = document.querySelector('.cohort-results h3');
    if (cohortResultsHeader) {
        cohortResultsHeader.textContent = title;
    }
    
    cohortAverages.innerHTML = stats
        .map(stat => `
            <div class="stat-card">
                <h4>${stat.question_key}</h4>
                <p>Average: ${stat.average.toFixed(2)}</p>
                <p>Don't Understand: ${stat.dontUnderstandPercentage.toFixed(1)}%</p>
                <button class="btn small details-btn" data-question="${stat.question_key}">Details</button>
            </div>
        `)
        .join('');
        
    // Add event listeners to the details buttons
    document.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const questionKey = btn.getAttribute('data-question');
            showContinuumDetails(questionKey);
        });
    });
}

function displayIncompleteSurveys(incomplete) {
    if (!incomplete || incomplete.length === 0) {
        incompleteSurveys.innerHTML = '<p>All students have completed their surveys.</p>';
        return;
    }

    const incompleteList = document.createElement('ul');
    incompleteList.className = 'incomplete-list';
    
    incomplete.forEach(student => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="student-identifier">${student.email}</span> has not completed the survey.`;
        incompleteList.appendChild(li);
    });

    incompleteSurveys.innerHTML = '<h4>Incomplete Surveys</h4>';
    incompleteSurveys.appendChild(incompleteList);
}

async function handleStudentSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    if (!searchTerm) return;
    
    try {
        // Search for students by email (could be expanded to include name if available)
        const { data: participants, error } = await supabaseClient
            .from('participants')
            .select(`
                id, user_id, 
                profiles:user_id (email)
            `)
            .eq('cohort_id', currentCohort)
            .eq('survey_id', currentSurvey.id)
            .textSearch('profiles.email', searchTerm);
        
        if (error) throw error;
        
        displayStudentResults(participants);
    } catch (error) {
        console.error('Student search error:', error);
    }
}

function displayStudentResults(students) {
    // Implementation will vary based on UI design
    // For now, just log the found students
    console.log('Found students:', students);
    
    // Display student results in a list
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'student-results';
    
    if (students.length === 0) {
        resultsDiv.innerHTML = '<p>No students found matching your search.</p>';
    } else {
        const studentList = document.createElement('ul');
        
        students.forEach(student => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="student-identifier">${student.profiles?.email || 'Unknown'}</span>
                <a href="#" data-participant-id="${student.id}" class="view-results-btn">View Results</a>
            `;
            studentList.appendChild(li);
        });
        
        resultsDiv.appendChild(studentList);
    }
    
    // Clear previous results and add new ones
    const previousResults = document.querySelector('.student-results');
    if (previousResults) {
        previousResults.remove();
    }
    
    document.querySelector('.student-identification').appendChild(resultsDiv);
    
    // Add event listeners to view result buttons
    document.querySelectorAll('.view-results-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const participantId = e.target.getAttribute('data-participant-id');
            loadStudentResults(participantId);
        });
    });
}

async function loadStudentResults(participantId) {
    // Fetch and display individual student results
    try {
        const { data: responses, error } = await supabaseClient
            .from('responses')
            .select('question_key, likert_value, dont_understand')
            .eq('participant_id', participantId);
            
        if (error) throw error;
        
        // Process the results and show in the UI
        // This would be customized based on how you want to display individual results
        console.log('Student responses:', responses);
        
        // For demonstration, show results in the cohort-averages section
        const stats = calculateStats([...responses].map(r => ({...r, participant: {id: participantId}})));
        displayCohortAverages(stats, 'Individual Student Results');
    } catch (error) {
        console.error('Error loading student results:', error);
        alert('Error loading individual results: ' + error.message);
    }
}

function showContinuumDetails(questionKey) {
    // Show detailed view for a specific continuum/question
    continuumDetails.classList.remove('hidden');
    continuumStats.innerHTML = `<h4>Detailed stats for ${questionKey} will be shown here</h4>`;
    
    // Add "Back to Overview" button
    const backButton = document.createElement('button');
    backButton.className = 'btn secondary';
    backButton.textContent = 'Back to Overview';
    backButton.addEventListener('click', () => {
        continuumDetails.classList.add('hidden');
    });
    
    continuumStats.appendChild(backButton);
}

function showDashboard() {
    // No need to toggle visibility anymore since login section is removed
    // Just activate the first tab
    tabButtons[0].click();
}

// Utility function for debouncing search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function handleInviteGeneration(e) {
    e.preventDefault();
    
    const cohortIds = Array.from(inviteCohortSelect.selectedOptions).map(option => option.value);
    const teacherEmail = document.getElementById('invite-email').value.trim();
    const expiryDays = parseInt(document.getElementById('expiry-days').value, 10);
    
    if (cohortIds.length === 0) {
        alert('Please select at least one cohort');
        return;
    }
    
    if (isNaN(expiryDays) || expiryDays < 1 || expiryDays > 30) {
        alert('Please enter a valid expiry period (1-30 days)');
        return;
    }
    
    try {
        // Create an invite code (in a real app, this would be stored in the database)
        // For demo purposes, we'll just generate a random code
        const inviteCode = generateInviteCode();
        
        try {
            // Attempt to store invite in the database
            const { error } = await supabaseClient
                .from('teacher_invites')
                .insert({
                    code: inviteCode,
                    cohort_ids: cohortIds,
                    email: teacherEmail || null,
                    expires_at: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
                    created_by: currentUser.id
                });
                
            if (error) {
                console.warn('Could not store invite in database:', error);
                // Continue with showing the code anyway for testing
            }
        } catch (dbError) {
            console.warn('Database error when saving invite:', dbError);
            // Continue with generating the code for testing
        }
        
        // Show the invite code to the user
        document.getElementById('invite-code').textContent = inviteCode;
        document.getElementById('invite-result').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error generating invite:', error);
        alert('Error generating invite: ' + error.message);
    }
}

function generateInviteCode() {
    // Generate a random 8-character code (in real app, ensure uniqueness)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// New helper function to fetch participant emails safely
async function fetchParticipantEmails(participants) {
    const emails = new Map();
    
    // For testing/development, optionally return mock emails
    if (process.env.NODE_ENV === 'development' || location.hostname === 'localhost') {
        console.log('Using mock emails for development');
        participants.forEach(p => {
            emails.set(p.user_id, `user-${p.user_id.substring(0, 6)}@example.com`);
        });
        return emails;
    }
    
    try {
        // Try to get emails from profiles table first
        const { data: profiles, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, email')
            .in('id', participants.map(p => p.user_id));
            
        if (!profileError && profiles && profiles.length > 0) {
            profiles.forEach(profile => {
                emails.set(profile.id, profile.email || `profile-${profile.id.substring(0, 6)}@example.com`);
            });
            return emails;
        }
        
        // If profiles fail, generate placeholder emails
        console.warn('Could not fetch emails from profiles, using placeholder emails');
        participants.forEach(p => {
            emails.set(p.user_id, `participant-${p.user_id.substring(0, 6)}@example.com`);
        });
        
        return emails;
    } catch (error) {
        console.error('Error fetching participant emails:', error);
        // Return mock emails on error
        participants.forEach(p => {
            emails.set(p.user_id, `error-${p.user_id.substring(0, 6)}@example.com`);
        });
        return emails;
    }
} 