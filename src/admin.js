// DOM Elements
const dashboardSection = document.getElementById('dashboard-section');
const logoutBtn = document.getElementById('logout-btn');
const userRoleDisplay = document.getElementById('user-role');
const inviteCohortSelect = document.getElementById('invite-cohort-select');
const cohortCheckboxes = document.getElementById('cohort-checkboxes');
const searchBtn = document.getElementById('search-btn');
const loadingIndicator = document.getElementById('loading-indicator');
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
let selectedCohorts = []; // Changed from single cohort to array of cohorts
let currentSurveys = {}; // Map of cohort IDs to their surveys
let studentIdentificationVisible = true;
let allResponses = []; // Store all responses for the cohort

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
        selectedCohorts = [];
        currentSurveys = {};
        
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
                <div class="checkbox-item">
                    <input type="checkbox" id="cohort-test-1" name="cohort" value="test-cohort-1">
                    <label for="cohort-test-1">Test Cohort 1</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="cohort-test-2" name="cohort" value="test-cohort-2">
                    <label for="cohort-test-2">Test Cohort 2</label>
                </div>
            `;
            cohortCheckboxes.innerHTML = testCohortOptions;
            
            // Keep the select element for invites
            const testSelectOptions = `
                <option value="test-cohort-1">Test Cohort 1</option>
                <option value="test-cohort-2">Test Cohort 2</option>
            `;
            inviteCohortSelect.innerHTML = testSelectOptions;
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
                <div class="checkbox-item">
                    <input type="checkbox" id="cohort-dev-1" name="cohort" value="dev-cohort-1">
                    <label for="cohort-dev-1">Development Cohort 1</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="cohort-dev-2" name="cohort" value="dev-cohort-2">
                    <label for="cohort-dev-2">Development Cohort 2</label>
                </div>
            `;
            cohortCheckboxes.innerHTML = testCohortOptions;
            
            // Keep the select element for invites
            const testSelectOptions = `
                <option value="dev-cohort-1">Development Cohort 1</option>
                <option value="dev-cohort-2">Development Cohort 2</option>
            `;
            inviteCohortSelect.innerHTML = testSelectOptions;
            return;
        }

        console.log('Loaded cohorts:', cohorts);

        if (cohorts && cohorts.length > 0) {
            // Update select element for invites
            const selectOptions = cohorts
                .map(cohort => `<option value="${cohort.id}">${cohort.label} (${cohort.code})</option>`)
                .join('');
            inviteCohortSelect.innerHTML = selectOptions;
            
            // Update checkboxes for cohort selection
            const checkboxItems = cohorts
                .map(cohort => `
                    <div class="checkbox-item">
                        <input type="checkbox" id="cohort-${cohort.id}" name="cohort" value="${cohort.id}">
                        <label for="cohort-${cohort.id}">${cohort.label} (${cohort.code})</label>
                    </div>
                `)
                .join('');
            cohortCheckboxes.innerHTML = checkboxItems;
            
            // Add selected cohorts display area
            const selectedDisplay = document.createElement('div');
            selectedDisplay.id = 'selected-cohorts-display';
            selectedDisplay.className = 'selected-cohorts';
            selectedDisplay.innerHTML = 'No cohorts selected';
            cohortCheckboxes.after(selectedDisplay);
            
            // Add event listeners to update selected display
            const checkboxes = document.querySelectorAll('input[name="cohort"]');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', updateSelectedCohortsDisplay);
            });

            // Add cohort survey mapping to each checkbox for validation
            const cohortSurveyMapping = {};
            cohorts.forEach(cohort => {
                cohortSurveyMapping[cohort.id] = cohort.survey_id;
            });
            
            // Store this mapping in a data attribute on the checkbox container
            const checkboxContainer = document.getElementById('cohort-checkboxes');
            if (checkboxContainer) {
                checkboxContainer.setAttribute('data-cohort-surveys', JSON.stringify(cohortSurveyMapping));
            }
        } else {
            console.warn('No cohorts found for the given IDs');
            // Add placeholder options
            const testCohortOptions = `
                <div class="checkbox-item">
                    <input type="checkbox" id="cohort-no-results-1" name="cohort" value="no-results-1">
                    <label for="cohort-no-results-1">No Assigned Cohorts (Test 1)</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="cohort-no-results-2" name="cohort" value="no-results-2">
                    <label for="cohort-no-results-2">No Assigned Cohorts (Test 2)</label>
                </div>
            `;
            cohortCheckboxes.innerHTML = testCohortOptions;
            
            // Keep the select element for invites
            const testSelectOptions = `
                <option value="no-results-1">No Assigned Cohorts (Test 1)</option>
                <option value="no-results-2">No Assigned Cohorts (Test 2)</option>
            `;
            inviteCohortSelect.innerHTML = testSelectOptions;
        }
    } catch (error) {
        console.error('Error loading cohorts:', error);
        alert('Error loading cohorts: ' + error.message);
        throw error; // Rethrow for handling in the calling function
    }
}

// Function to update the selected cohorts display
function updateSelectedCohortsDisplay() {
    const selectedDisplay = document.getElementById('selected-cohorts-display');
    if (!selectedDisplay) return;
    
    const checkboxes = document.querySelectorAll('input[name="cohort"]:checked');
    const selectedLabels = Array.from(checkboxes).map(cb => {
        const label = document.querySelector(`label[for="${cb.id}"]`);
        return label ? label.textContent : cb.value;
    });
    
    if (selectedLabels.length === 0) {
        selectedDisplay.innerHTML = 'No cohorts selected';
        selectedDisplay.className = 'selected-cohorts';
        document.getElementById('search-btn').disabled = false;
        return;
    } else {
        selectedDisplay.innerHTML = `<strong>Selected:</strong> ${selectedLabels.join(', ')}`;
    }
    
    // Check if selected cohorts have compatible surveys
    const selectedCohortIds = Array.from(checkboxes).map(cb => cb.value);
    const isSurveyCompatible = validateSurveyCompatibility(selectedCohortIds);
    
    if (!isSurveyCompatible.valid) {
        // Show warning in the selected display
        selectedDisplay.className = 'selected-cohorts warning';
        selectedDisplay.innerHTML += `<div class="warning-message">Warning: These cohorts are linked to different surveys. Comparing results across different surveys may not be meaningful.</div>`;
        
        // Add tooltip with incompatible cohorts
        if (isSurveyCompatible.incompatibleGroups.length > 0) {
            const tooltipHtml = isSurveyCompatible.incompatibleGroups.map(group => 
                `<div>${group.join(', ')}</div>`
            ).join('');
            
            const warningIcon = document.createElement('span');
            warningIcon.className = 'warning-icon';
            warningIcon.innerHTML = '⚠️';
            warningIcon.title = 'Incompatible surveys';
            selectedDisplay.querySelector('.warning-message').prepend(warningIcon);
        }
        
        // Disable search button to prevent searching across different surveys
        document.getElementById('search-btn').disabled = true;
    } else {
        // Update classes and enable search
        selectedDisplay.className = 'selected-cohorts';
        document.getElementById('search-btn').disabled = false;
    }
}

// Function to validate survey compatibility across selected cohorts
function validateSurveyCompatibility(selectedCohortIds) {
    // Try to get the cohort-survey mapping
    const checkboxContainer = document.getElementById('cohort-checkboxes');
    if (!checkboxContainer) {
        return { valid: true }; // Can't validate, so assume valid
    }
    
    const mappingStr = checkboxContainer.getAttribute('data-cohort-surveys');
    if (!mappingStr) {
        return { valid: true }; // No mapping data, assume valid
    }
    
    try {
        const cohortSurveyMapping = JSON.parse(mappingStr);
        
        // Group cohorts by survey ID
        const surveyGroups = {};
        
        selectedCohortIds.forEach(cohortId => {
            const surveyId = cohortSurveyMapping[cohortId];
            if (!surveyId) return; // Skip if no survey ID
            
            if (!surveyGroups[surveyId]) {
                surveyGroups[surveyId] = [];
            }
            
            // Get readable cohort label for display
            const checkboxEl = document.getElementById(`cohort-${cohortId}`);
            const labelEl = checkboxEl ? document.querySelector(`label[for="cohort-${cohortId}"]`) : null;
            const cohortLabel = labelEl ? labelEl.textContent : cohortId;
            
            surveyGroups[surveyId].push(cohortLabel);
        });
        
        // Check if all cohorts belong to the same survey
        const surveyIds = Object.keys(surveyGroups);
        const valid = surveyIds.length <= 1;
        
        return {
            valid,
            incompatibleGroups: Object.values(surveyGroups)
        };
    } catch (e) {
        console.error('Error parsing cohort-survey mapping:', e);
        return { valid: true }; // In case of error, assume valid
    }
}

async function handleSearch() {
    // Get all checked cohort checkboxes
    const checkedCohorts = document.querySelectorAll('input[name="cohort"]:checked');
    const selectedCohortIds = Array.from(checkedCohorts).map(checkbox => checkbox.value);

    if (selectedCohortIds.length === 0) {
        alert('Please select at least one cohort');
        return;
    }
    
    // Verify survey compatibility before proceeding
    const isSurveyCompatible = validateSurveyCompatibility(selectedCohortIds);
    if (!isSurveyCompatible.valid) {
        alert('Cannot search across cohorts with different surveys. Please select cohorts from the same survey.');
        return;
    }

    try {
        selectedCohorts = selectedCohortIds;
        
        console.log(`Searching for results with cohort IDs: ${selectedCohortIds.join(', ')}`);
        
        // Get the survey IDs from the cohorts
        const { data: cohortsData, error: cohortError } = await supabaseClient
            .from('cohorts')
            .select('id, code, survey_id')
            .in('id', selectedCohortIds);
            
        if (cohortError || !cohortsData || cohortsData.length === 0) {
            console.error('Error fetching cohort data:', cohortError);
            alert('Error: Could not fetch cohort data');
            return;
        }
        
        // Check if any cohorts are missing survey_id
        const missingCohorts = cohortsData.filter(c => !c.survey_id);
        if (missingCohorts.length > 0) {
            console.warn('Some cohorts do not have an associated survey:', missingCohorts);
            if (missingCohorts.length === cohortsData.length) {
                alert('None of the selected cohorts have associated surveys');
                return;
            }
            alert(`Note: ${missingCohorts.length} cohort(s) do not have associated surveys and will be skipped.`);
        }
        
        // Get cohorts with valid survey IDs
        const validCohorts = cohortsData.filter(c => c.survey_id);
        if (validCohorts.length === 0) {
            console.warn('No valid cohorts with surveys found');
            alert('No valid cohorts with surveys found');
            return;
        }
        
        // Get all the surveys at once
        const surveyIds = validCohorts.map(c => c.survey_id);
        const { data: surveysData, error: surveyError } = await supabaseClient
            .from('surveys')
            .select('id, json_config')
            .in('id', surveyIds);
            
        if (surveyError) {
            console.error('Error fetching survey data:', surveyError);
            alert('Error: Could not fetch survey data');
            return;
        }
        
        if (!surveysData || surveysData.length === 0) {
            console.warn('No surveys found for the selected cohorts');
            alert('No surveys found for the selected cohorts');
            return;
        }
        
        // Map surveys to their respective cohorts
        currentSurveys = {};
        validCohorts.forEach(cohort => {
            const survey = surveysData.find(s => s.id === cohort.survey_id);
            if (survey) {
                currentSurveys[cohort.id] = survey;
            }
        });
        
        console.log('Using cohorts and surveys:', currentSurveys);
        
        // Log the structure of the first survey's json_config to debug
        const firstSurveyId = Object.values(currentSurveys)[0]?.id;
        if (firstSurveyId) {
            console.log('First survey ID:', firstSurveyId);
            console.log('First survey json_config:', Object.values(currentSurveys)[0]?.json_config);
            
            const jsonConfig = Object.values(currentSurveys)[0]?.json_config;
            if (jsonConfig) {
                console.log('Survey has continua:', !!jsonConfig.continua);
                console.log('Survey has statements:', !!jsonConfig.statements);
                
                if (jsonConfig.continua) {
                    console.log('Continua keys:', Object.keys(jsonConfig.continua));
                }
                
                if (jsonConfig.statements) {
                    console.log('Number of statements:', jsonConfig.statements.length);
                    console.log('Sample statement:', jsonConfig.statements[0]);
                }
            }
        }
        
        try {
            await loadCohortResults();
        } catch (resultError) {
            console.warn('Error loading cohort results:', resultError);
            alert(`Error: ${resultError.message || 'Could not load results'}`);
        }
        
        resultsContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Search error:', error);
        alert('Error loading results: ' + error.message);
    }
}

async function getSurveyByCode(code) {
    try {
        console.log('Looking for survey with code:', code);
        
        // Search directly in surveys table by code field
        let { data: surveyByCode, error: surveyCodeError } = await supabaseClient
            .from('surveys')
            .select('id, json_config')
            .eq('code', code)
            .maybeSingle();
            
        if (!surveyCodeError && surveyByCode) {
            console.log('Found survey by code field:', surveyByCode);
            return surveyByCode;
        }
        
        if (surveyCodeError) {
            console.warn('Error searching by survey code:', surveyCodeError);
        } else {
            console.warn('No survey found with the provided code');
        }
        
        // Try direct UUID match (if code happens to be a UUID)
        if (code.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            let { data: surveyById, error: surveyIdError } = await supabaseClient
                .from('surveys')
                .select('id, json_config')
                .eq('id', code)
                .maybeSingle();
                
            if (!surveyIdError && surveyById) {
                console.log('Found survey by ID:', surveyById);
                return surveyById;
            }
        }
        
        // Fallback: look for the survey through the cohort table
        const { data: cohort, error: cohortError } = await supabaseClient
            .from('cohorts')
            .select('id, survey_id')
            .eq('code', code)
            .maybeSingle();
            
        if (cohortError) {
            console.warn('Error fetching cohort by code:', cohortError);
        } else if (cohort && cohort.survey_id) {
            // Now get the survey using the survey_id from the cohort
            const { data: surveyFromCohort, error: surveyError } = await supabaseClient
                .from('surveys')
                .select('id, json_config')
                .eq('id', cohort.survey_id)
                .single();
                
            if (surveyError) {
                console.warn('Error fetching survey by ID from cohort:', surveyError);
            } else {
                console.log('Found survey through cohort:', surveyFromCohort);
                return surveyFromCohort;
            }
        }
        
        console.warn('No survey found for code through any method:', code);
        return null;
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
        loadingIndicator.style.display = 'block';
        resultsContainer.classList.add('hidden');
        
        console.log('Loading results for cohorts:', selectedCohorts, 'and surveys:', currentSurveys);
        
        // Check the mapping between cohort and survey in the database
        try {
            const { data: cohortSurveys, error: cohortSurveyError } = await supabaseClient
                .from('cohorts')
                .select('id, code, label');
                
            if (cohortSurveyError) {
                console.error('Error loading cohort-survey mapping:', cohortSurveyError);
            } else {
                console.log('Cohort-Survey relationship mapping:', cohortSurveys);
            }
        } catch (e) {
            console.error('Exception in cohort-survey check:', e);
        }
        
        // First, get all participants for these cohorts/surveys
        const { data: allParticipants, error: participantError } = await supabaseClient
            .from('participants')
            .select('id, user_id, cohort_id, survey_id');
            
        if (participantError) {
            console.error('Error loading participants:', participantError);
            throw new Error('Could not load participant data');
        }
        
        console.log('Found', allParticipants?.length || 0, 'total participants in database:', allParticipants);
        
        // Extract unique cohort IDs used by participants
        const uniqueCohorts = [...new Set(allParticipants.map(p => p.cohort_id))];
        
        // Get all cohort details
        const { data: cohortsData, error: cohortDetailsError } = await supabaseClient
            .from('cohorts')
            .select('id, code, label')
            .in('id', uniqueCohorts);
            
        if (cohortDetailsError) {
            console.error('Error loading cohort details:', cohortDetailsError);
        } else {
            console.log('Cohorts used by participants:', cohortsData);
        }
        
        // Find details of our specific cohorts
        let cohortDetails = null;
        if (cohortsData) {
            cohortDetails = cohortsData.filter(c => selectedCohorts.includes(c.id));
            if (cohortDetails.length > 0) {
                console.log('Cohort details:', cohortDetails);
            } else {
                console.warn('Current cohorts not found in database:', selectedCohorts);
            }
        }
        
        // Filter participants by the selected cohorts and surveys
        const surveyParticipants = allParticipants.filter(p => selectedCohorts.includes(p.cohort_id) && p.survey_id);
        const cohortParticipants = allParticipants.filter(p => selectedCohorts.includes(p.cohort_id));
        const participants = allParticipants.filter(p => 
            selectedCohorts.includes(p.cohort_id) && 
            p.survey_id
        );
        
        console.log('Found', surveyParticipants.length, 'participants for surveys across selected cohorts:', surveyParticipants);
        console.log('Found', cohortParticipants.length, 'participants for selected cohorts:', cohortParticipants);
        
        if (!participants || participants.length === 0) {
            // No participants found for these cohorts/surveys
            loadingIndicator.style.display = 'none';
            resultsContainer.classList.remove('hidden');
            
            // Display a helpful message
            cohortAverages.innerHTML = `
                <div class="no-results">
                    <h4>No Participants Found</h4>
                    <p>No students have taken these surveys in these cohorts yet.</p>
                    <p>Cohorts: ${selectedCohorts.map(id => cohortsData.find(c => c.id === id)?.label || id).join(', ')}</p>
                    <p>Surveys: ${selectedCohorts.map(id => currentSurveys[id]?.code || id).join(', ')}</p>
                </div>
            `;
            incompleteSurveys.innerHTML = '';
            return;
        }
        
        console.log('Found', participants.length, 'participants for these cohorts/surveys');
        
        // Get participant IDs for use in the responses query
        const participantIds = participants.map(p => p.id);
        console.log('Participant IDs to search for responses:', participantIds);

        // Check if any responses exist at all in the database for debugging
        try {
            const { data: testResponses, error: allRespError } = await supabaseClient
                .from('responses')
                .select('id, participant_id, question_key, likert_value, dont_understand')
                .limit(20);
                
            if (allRespError) {
                console.error('Error checking all responses:', allRespError);
            } else {
                console.log(`Found ${testResponses?.length || 0} total responses in database:`, testResponses);
            }
        } catch (e) {
            console.error('Error in all responses check:', e);
        }

        // Load responses for these participants
        const { data: responses, error: responseError } = await supabaseClient
            .from('responses')
            .select('question_key, likert_value, dont_understand, participant_id')
            .in('participant_id', participantIds);
            
        if (responseError) {
            console.error('Error loading responses:', responseError);
            throw new Error('Could not load survey responses');
        }
        
        // Store responses in the global variable for details view
        allResponses = responses || [];
        
        console.log(`Found ${responses?.length || 0} responses for participants in these cohorts/surveys`);
        
        if (!responses || responses.length === 0) {
            // No responses found for these participants
            loadingIndicator.style.display = 'none';
            resultsContainer.classList.remove('hidden');
            
            cohortAverages.innerHTML = `
                <div class="no-results">
                    <h4>No Responses Found</h4>
                    <p>Participants exist for these cohorts and surveys, but no responses have been recorded.</p>
                    <p>This could mean students have started but not completed their surveys.</p>
                </div>
            `;
            
            // Show "incomplete surveys" section
            const { data: participantEmails } = await fetchParticipantEmails(participants);
            
            displayIncompleteSurveys(participants.map(p => ({
                id: p.id,
                email: participantEmails.get(p.user_id) || 'Unknown'
            })));
            
            return;
        }
        
        // Calculate statistics
        const stats = calculateStats(responses);
        
        // Display results
        displayCohortAverages(stats);
        
        // Check for incomplete surveys
        try {
            const { data: participantEmails } = await fetchParticipantEmails(participants);
            
            // Determine required questions for these surveys
            let requiredQuestionCount = 0;
            try {
                const surveyQuestions = currentSurveys[selectedCohorts[0]]?.json_config?.questions || [];
                requiredQuestionCount = surveyQuestions.filter(q => q.required).length;
            } catch (e) {
                console.error('Error determining required questions:', e);
                requiredQuestionCount = 10; // Fallback to a default number
            }
            
            // Group responses by participant
            const responsesByParticipant = {};
            responses.forEach(response => {
                if (!responsesByParticipant[response.participant_id]) {
                    responsesByParticipant[response.participant_id] = 0;
                }
                responsesByParticipant[response.participant_id]++;
            });
            
            // Find participants with incomplete surveys
            const incomplete = participants
                .filter(p => {
                    const responseCount = responsesByParticipant[p.id] || 0;
                    return responseCount < requiredQuestionCount;
                })
                .map(p => ({
                    id: p.id,
                    email: participantEmails.get(p.user_id) || 'Unknown'
                }));
            
            displayIncompleteSurveys(incomplete);
        } catch (error) {
            console.error('Error checking incomplete surveys:', error);
        }
        
        // Show results section
        loadingIndicator.style.display = 'none';
        resultsContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading cohort results:', error);
        loadingIndicator.style.display = 'none';
        
        cohortAverages.innerHTML = `
            <div class="error-message">
                <h4>Error Loading Results</h4>
                <p>${error.message || 'An unexpected error occurred'}</p>
            </div>
        `;
        
        resultsContainer.classList.remove('hidden');
    }
}

function calculateStats(responses) {
    const stats = {};
    
    responses.forEach(response => {
        const questionKey = response.question_key;
        
        if (!stats[questionKey]) {
            stats[questionKey] = {
                sum: 0,
                count: 0,
                dontUnderstand: 0,
                values: [] // Store all values for standard deviation calculation
            };
        }
        
        if (response.dont_understand) {
            stats[questionKey].dontUnderstand++;
        }
        
        if (response.likert_value !== null) {
            stats[questionKey].sum += response.likert_value;
            stats[questionKey].count++;
            stats[questionKey].values.push(response.likert_value);
        }
    });
    
    return Object.entries(stats).map(([key, data]) => {
        // Calculate average
        const average = data.count > 0 ? data.sum / data.count : 0;
        
        // Calculate standard deviation
        let stdDev = 0;
        if (data.values.length > 1) {
            let sumSquaredDiffs = 0;
            data.values.forEach(value => {
                const diff = value - average;
                sumSquaredDiffs += diff * diff;
            });
            const variance = sumSquaredDiffs / data.values.length;
            stdDev = Math.sqrt(variance);
        }
        
        // Calculate don't understand percentage
        const dontUnderstandPercentage = (data.dontUnderstand / (data.count + data.dontUnderstand)) * 100 || 0;
        
        return {
            question_key: key,
            average,
            stdDev,
            dontUnderstandPercentage
        };
    });
}

function displayCohortAverages(stats, title = 'Cohort Overview') {
    // Update the header if a custom title is provided
    const cohortResultsHeader = document.querySelector('.cohort-results h3');
    if (cohortResultsHeader) {
        cohortResultsHeader.textContent = title;
    }
    
    // Clear existing content
    if (cohortAverages) {
        cohortAverages.innerHTML = '';
        
        // If no stats, show a message
        if (!stats || stats.length === 0) {
            cohortAverages.innerHTML = '<p>No survey statistics available.</p>';
            return;
        }
        
        // Get the survey configuration from the first selected cohort
        const surveyData = currentSurveys[selectedCohorts[0]];
        if (!surveyData) {
            console.error('No survey data found for cohort:', selectedCohorts[0]);
            cohortAverages.innerHTML = '<p>Survey configuration not found.</p>';
            return;
        }
        
        // Access the json_config property which contains the survey structure
        const surveyConfig = surveyData.json_config || {};
        console.log('Survey config:', surveyConfig);
        
        // Get continua and statements from survey config
        const continua = surveyConfig.continua || {};
        const statements = surveyConfig.statements || [];
        
        // Check if we have continuum data
        const hasContinuaData = Object.keys(continua).length > 0;
        
        if (hasContinuaData) {
            console.log('Found continua data in survey config:', continua);
        } else {
            console.warn('No continua found in survey configuration');
        }
        
        // Group stats by continuum or infer grouping from question keys
        const continuaStats = {};
        
        if (hasContinuaData && statements.length > 0) {
            // MATCHING APPROACH: Try to match each stat to its continuum using statements
            
            // First, build a mapping of question_key to continuum and alignment
            const questionContinuumMap = {};
            statements.forEach(statement => {
                if (statement.id && statement.continuum) {
                    questionContinuumMap[statement.id] = {
                        continuum: statement.continuum,
                        alignment: statement.alignment || 'left'
                    };
                }
            });
            
            console.log('Question to continuum mapping:', questionContinuumMap);
            
            // Initialize each continuum
            Object.keys(continua).forEach(continuumKey => {
                continuaStats[continuumKey] = {
                    name: continua[continuumKey].name || continuumKey,
                    labels: continua[continuumKey].labels || { left: 'Left', right: 'Right' },
                    scores: [],
                    dontUnderstandPercentage: 0,
                    average: 0,
                    details: []
                };
            });
            
            // Process each stat and assign to proper continuum
            stats.forEach(stat => {
                const mapping = questionContinuumMap[stat.question_key];
                if (mapping && mapping.continuum) {
                    const continuumKey = mapping.continuum;
                    
                    // Only process if this continuum is in our survey
                    if (continuaStats[continuumKey]) {
                        // Apply value adjustment based on alignment
                        let value = stat.average;
                        
                        // If alignment is "right", reverse the value for consistent scoring
                        if (mapping.alignment === 'right') {
                            value = -value; // Invert the value
                        }
                        
                        continuaStats[continuumKey].scores.push(value);
                        continuaStats[continuumKey].details.push(stat);
                    }
                }
            });
            
            // Calculate averages for each continuum
            Object.keys(continuaStats).forEach(continuumKey => {
                const scores = continuaStats[continuumKey].scores;
                if (scores.length > 0) {
                    const sum = scores.reduce((a, b) => a + b, 0);
                    continuaStats[continuumKey].average = sum / scores.length;
                }
            });
        } else {
            // FALLBACK APPROACH: Infer groups from question keys (e.g., rules_energy_5 → rules_energy)
            const groupedStats = {};
            
            // First pass: group stats by inferred category
            stats.forEach(stat => {
                // Extract the base category from question_key (e.g., "rules_energy" from "rules_energy_5")
                const parts = stat.question_key.split('_');
                if (parts.length >= 2) {
                    // Use first two parts as the category (e.g., "rules_energy")
                    const category = `${parts[0]}_${parts[1]}`;
                    
                    if (!groupedStats[category]) {
                        groupedStats[category] = [];
                    }
                    
                    groupedStats[category].push(stat);
                }
            });
            
            // Second pass: create continuum stats from groups
            Object.keys(groupedStats).forEach(category => {
                const categoryStats = groupedStats[category];
                
                // Calculate average for this category
                let sum = 0;
                let count = 0;
                let dontUnderstandSum = 0;
                
                categoryStats.forEach(stat => {
                    sum += stat.average;
                    count++;
                    dontUnderstandSum += stat.dontUnderstandPercentage;
                });
                
                const categoryAverage = count > 0 ? sum / count : 0;
                const dontUnderstandAvg = count > 0 ? dontUnderstandSum / count : 0;
                
                // Format category name (e.g., "rules_energy" → "Rules Energy")
                const formattedName = category
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                
                // Create a synthetic continuum for this category
                continuaStats[category] = {
                    name: formattedName,
                    labels: {
                        left: 'Negative',
                        right: 'Positive'
                    },
                    scores: categoryStats.map(s => s.average),
                    average: categoryAverage,
                    dontUnderstandPercentage: dontUnderstandAvg,
                    details: categoryStats
                };
            });
        }
        
        // Create the continuum visualization container
        const continuaContainer = document.createElement('div');
        continuaContainer.className = 'continuum-grid';
        
        // Create visualization for each continuum
        Object.keys(continuaStats).forEach(continuumKey => {
            const continuum = continuaStats[continuumKey];
            const continuumElement = createContinuumVisual(continuum, continuumKey);
            continuaContainer.appendChild(continuumElement);
        });
        
        // Add the container to the cohort averages section
        cohortAverages.appendChild(continuaContainer);
        
        // Add detailed stats after the visualizations
        const detailedStatsContainer = document.createElement('div');
        detailedStatsContainer.className = 'detailed-stats';
        detailedStatsContainer.innerHTML = '<h4>Detailed Statistics</h4>';
        
        // Create stat cards for each statistic (old view)
        const statCardsContainer = document.createElement('div');
        statCardsContainer.className = 'stat-cards-container';
        
        stats.forEach(stat => {
            const statCard = document.createElement('div');
            statCard.className = 'stat-card';
            
            const heading = document.createElement('h4');
            heading.textContent = stat.question_key;
            
            const avgP = document.createElement('p');
            avgP.textContent = `Average: ${stat.average.toFixed(2)}`;
            
            const stdDevP = document.createElement('p');
            stdDevP.textContent = `Std Dev: ${stat.stdDev.toFixed(2)}`;
            
            const dontUnderstandP = document.createElement('p');
            dontUnderstandP.textContent = `Don't Understand: ${stat.dontUnderstandPercentage.toFixed(1)}%`;
            
            const detailsBtn = document.createElement('button');
            detailsBtn.className = 'btn small details-btn';
            detailsBtn.textContent = 'Details';
            detailsBtn.setAttribute('data-question', stat.question_key);
            
            // Add direct click handler
            detailsBtn.onclick = function() {
                showContinuumDetails(stat.question_key);
            };
            
            // Append all elements to card
            statCard.appendChild(heading);
            statCard.appendChild(avgP);
            statCard.appendChild(stdDevP);
            statCard.appendChild(dontUnderstandP);
            statCard.appendChild(detailsBtn);
            
            // Add card to container
            statCardsContainer.appendChild(statCard);
        });
        
        detailedStatsContainer.appendChild(statCardsContainer);
        cohortAverages.appendChild(detailedStatsContainer);
    } else {
        console.error('cohortAverages element not found');
    }
}

// Helper function to create a visual representation of a continuum
function createContinuumVisual(continuum, continuumKey) {
    const percentPosition = ((continuum.average + 2) / 4) * 100;
    const avgValue = continuum.average;
    
    // Determine if this is an inferred continuum (has default left/right labels)
    const isInferred = continuum.labels.left === 'Negative' && continuum.labels.right === 'Positive';
    
    const leftLabel = continuum.labels?.left || 'Left';
    const rightLabel = continuum.labels?.right || 'Right';
    
    // Generate a perspective statement
    let perspectiveStatement = "";
    if (isInferred) {
        // For inferred continuums, use simpler statements
        if (avgValue <= -1.5) {
            perspectiveStatement = `This cohort responds primarily <strong>negatively</strong> in this area.`;
        } else if (avgValue <= -0.75) {
            perspectiveStatement = `This cohort tends toward <strong>disagreement</strong> in this area.`;
        } else if (avgValue < 0) {
            perspectiveStatement = `This cohort <strong>slightly</strong> tends toward disagreement in this area.`;
        } else if (avgValue === 0) {
            perspectiveStatement = `This cohort has a <strong>balanced</strong> perspective in this area.`;
        } else if (avgValue <= 0.75) {
            perspectiveStatement = `This cohort <strong>slightly</strong> tends toward agreement in this area.`;
        } else if (avgValue <= 1.5) {
            perspectiveStatement = `This cohort tends toward <strong>agreement</strong> in this area.`;
        } else {
            perspectiveStatement = `This cohort responds primarily <strong>positively</strong> in this area.`;
        }
    } else {
        // For defined continuums, use the original statements with explicit spaces
        if (avgValue <= -1.5) {
            perspectiveStatement = `This cohort <strong>strongly</strong> leans towards <strong>${leftLabel}</strong>.`;
        } else if (avgValue <= -0.75) {
            perspectiveStatement = `This cohort <strong>moderately</strong> leans towards <strong>${leftLabel}</strong>.`;
        } else if (avgValue < 0) {
            perspectiveStatement = `This cohort <strong>slightly</strong> leans towards <strong>${leftLabel}</strong>.`;
        } else if (avgValue === 0) {
            perspectiveStatement = `This cohort has a <strong>balanced</strong> perspective between <strong>${leftLabel}</strong> and <strong>${rightLabel}</strong>.`;
        } else if (avgValue <= 0.75) {
            perspectiveStatement = `This cohort <strong>slightly</strong> leans towards <strong>${rightLabel}</strong>.`;
        } else if (avgValue <= 1.5) {
            perspectiveStatement = `This cohort <strong>moderately</strong> leans towards <strong>${rightLabel}</strong>.`;
        } else {
            perspectiveStatement = `This cohort <strong>strongly</strong> leans towards <strong>${rightLabel}</strong>.`;
        }
    }
    
    // Get the average value to display
    const displayAverage = avgValue.toFixed(2);
    
    // Create the continuum visualization element
    const continuumElement = document.createElement('div');
    continuumElement.className = 'continuum-result';
    
    // Create the inner HTML with controlled spacing
    const innerHTML = `
        <h3>${continuum.name}</h3>
        <p class="perspective-statement-brief">${perspectiveStatement}</p>
        <div class="continuum-scale">
            <div class="continuum-left">${leftLabel}</div>
            <div class="continuum-right">${rightLabel}</div>
            <div class="continuum-marker" style="left: ${percentPosition}%"></div>
        </div>
        <div class="average-value">Average: ${displayAverage}</div>
        <div class="text-center">
            <button class="details-btn" data-continuum="${continuumKey}">View Details</button>
        </div>
    `;
    
    continuumElement.innerHTML = innerHTML;
    
    // Add event listener to the details button
    continuumElement.querySelector('.details-btn').addEventListener('click', () => {
        // Show detailed stats for this continuum
        const detailedStats = continuum.details;
        if (detailedStats && detailedStats.length > 0) {
            showContinuumDetails(detailedStats[0].question_key); // Show details for first question in this continuum
        }
    });
    
    return continuumElement;
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
    const searchTerm = e.target.value.toLowerCase().trim();
    if (!searchTerm || searchTerm.length < 2) {
        // Clear previous results if search is empty or too short
        const previousResults = document.querySelector('.student-results');
        if (previousResults) {
            previousResults.remove();
        }
        return;
    }
    
    try {
        console.log(`Searching for students matching "${searchTerm}" in cohorts ${selectedCohorts.join(', ')}`);
        
        // Get all participants for these cohorts/surveys and then filter locally
        // This avoids issues with RLS policies and textSearch compatibility
        const { data: participants, error } = await supabaseClient
            .from('participants')
            .select(`
                id, user_id
            `)
            .in('cohort_id', selectedCohorts);
        
        if (error) {
            console.error('Error fetching participants:', error);
            throw error;
        }
        
        if (!participants || participants.length === 0) {
            displayStudentResults([]);
            return;
        }
        
        // Get emails for all participants
        const participantEmails = await fetchParticipantEmails(participants);
        
        // Filter participants locally based on email match
        const matchingParticipants = participants.filter(p => {
            const email = participantEmails.get(p.user_id) || '';
            return email.toLowerCase().includes(searchTerm);
        }).map(p => ({
            id: p.id,
            user_id: p.user_id,
            profiles: { email: participantEmails.get(p.user_id) || 'Unknown' }
        }));
        
        console.log(`Found ${matchingParticipants.length} matching participants`);
        displayStudentResults(matchingParticipants);
    } catch (error) {
        console.error('Student search error:', error);
        const errorMessage = `<p>Error searching for students: ${error.message || 'Unknown error'}</p>`;
        
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'student-results';
        resultsDiv.innerHTML = errorMessage;
        
        const previousResults = document.querySelector('.student-results');
        if (previousResults) {
            previousResults.remove();
        }
        
        document.querySelector('.student-identification').appendChild(resultsDiv);
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
        console.log('Loading results for participant:', participantId);
        
        // First verify this participant belongs to one of the current cohorts
        const { data: participant, error: participantError } = await supabaseClient
            .from('participants')
            .select('id, user_id, cohort_id, survey_id')
            .eq('id', participantId)
            .in('cohort_id', selectedCohorts) // Make sure participant is in one of the selected cohorts
            .single();
            
        if (participantError) {
            console.error('Error verifying participant:', participantError);
            throw new Error('Could not verify participant belongs to the selected cohorts');
        }
        
        if (!participant) {
            console.error('Participant not found or not authorized');
            throw new Error('Participant not found in the selected cohorts');
        }
        
        // Now get the responses for this participant
        const { data: responses, error: responseError } = await supabaseClient
            .from('responses')
            .select('question_key, likert_value, dont_understand')
            .eq('participant_id', participantId);
            
        if (responseError) {
            console.error('Error loading participant responses:', responseError);
            throw new Error('Could not load participant responses');
        }
        
        if (!responses || responses.length === 0) {
            console.warn('No responses found for this participant');
            displayCohortAverages([], 'No Survey Responses Found');
            return;
        }
        
        console.log(`Found ${responses.length} responses for participant`);
        
        // Get participant email for the title
        const participantEmails = await fetchParticipantEmails([participant]);
        const participantEmail = participantEmails.get(participant.user_id) || 'Unknown';
        
        // Process the results and show in the UI
        const stats = calculateStats(responses);
        displayCohortAverages(stats, `Results for ${participantEmail}`);
    } catch (error) {
        console.error('Error loading student results:', error);
        alert('Error loading individual results: ' + (error.message || 'Unknown error'));
    }
}

function showContinuumDetails(questionKey) {
    // Show detailed view for a specific continuum/question
    
    // Make sure the elements exist
    if (!continuumDetails) {
        console.error('continuumDetails element not found');
        return;
    }
    
    if (!continuumStats) {
        console.error('continuumStats element not found');
        return;
    }
    
    // Force element to be shown with important styles
    continuumDetails.classList.remove('hidden');
    continuumDetails.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
    
    // Prepare to load the data for this specific question
    const questionResponses = allResponses.filter(r => r.question_key === questionKey);
    
    // Clear existing content
    continuumStats.innerHTML = '';
    
    if (!questionResponses || questionResponses.length === 0) {
        const noDataHeading = document.createElement('h4');
        noDataHeading.textContent = `No detailed data available for ${questionKey}`;
        continuumStats.appendChild(noDataHeading);
        
        // Add "Back to Overview" button
        const backButton = document.createElement('button');
        backButton.className = 'btn secondary';
        backButton.textContent = 'Back to Overview';
        backButton.onclick = function() {
            hideDetails();
        };
        
        continuumStats.appendChild(backButton);
        return;
    }
    
    // Count responses for each likert value and don't understand
    const counts = {
        '-2': 0,
        '-1': 0,
        '1': 0,
        '2': 0,
        'dontUnderstand': 0
    };
    
    // Total number of responses for calculating percentages
    let total = questionResponses.length;
    
    // Count each response type
    questionResponses.forEach(response => {
        if (response.dont_understand) {
            counts.dontUnderstand++;
        }
        
        if (response.likert_value !== null) {
            counts[response.likert_value.toString()]++;
        }
    });
    
    // Create the heading
    const heading = document.createElement('h4');
    heading.textContent = `Response Distribution for "${questionKey}"`;
    continuumStats.appendChild(heading);
    
    // Create distribution container
    const distributionContainer = document.createElement('div');
    distributionContainer.className = 'distribution-container';
    
    // Create distribution bar
    const distributionBar = document.createElement('div');
    distributionBar.className = 'distribution-bar';
    
    // Add segments for each response type
    const negTwoSegment = document.createElement('div');
    negTwoSegment.className = 'distribution-segment neg-two';
    negTwoSegment.style.width = `${(counts['-2'] / total * 100).toFixed(1)}%`;
    negTwoSegment.innerHTML = `<span class="segment-value">${counts['-2']}</span>`;
    distributionBar.appendChild(negTwoSegment);
    
    const negOneSegment = document.createElement('div');
    negOneSegment.className = 'distribution-segment neg-one';
    negOneSegment.style.width = `${(counts['-1'] / total * 100).toFixed(1)}%`;
    negOneSegment.innerHTML = `<span class="segment-value">${counts['-1']}</span>`;
    distributionBar.appendChild(negOneSegment);
    
    const posOneSegment = document.createElement('div');
    posOneSegment.className = 'distribution-segment pos-one';
    posOneSegment.style.width = `${(counts['1'] / total * 100).toFixed(1)}%`;
    posOneSegment.innerHTML = `<span class="segment-value">${counts['1']}</span>`;
    distributionBar.appendChild(posOneSegment);
    
    const posTwoSegment = document.createElement('div');
    posTwoSegment.className = 'distribution-segment pos-two';
    posTwoSegment.style.width = `${(counts['2'] / total * 100).toFixed(1)}%`;
    posTwoSegment.innerHTML = `<span class="segment-value">${counts['2']}</span>`;
    distributionBar.appendChild(posTwoSegment);
    
    distributionContainer.appendChild(distributionBar);
    
    // Add labels
    const labels = document.createElement('div');
    labels.className = 'distribution-labels';
    labels.innerHTML = `
        <div>Strongly Disagree (-2)</div>
        <div>Disagree (-1)</div>
        <div>Agree (1)</div>
        <div>Strongly Agree (2)</div>
    `;
    distributionContainer.appendChild(labels);
    
    // Add to the stats container
    continuumStats.appendChild(distributionContainer);
    
    // Add "Don't Understand" stats
    const dontUnderstandStat = document.createElement('div');
    dontUnderstandStat.className = 'dont-understand-stat';
    dontUnderstandStat.innerHTML = `
        <h5>"Don't Understand" Responses:</h5>
        <p>${counts.dontUnderstand} students (${(counts.dontUnderstand / total * 100).toFixed(1)}%)</p>
    `;
    continuumStats.appendChild(dontUnderstandStat);
    
    // Add summary
    const summary = document.createElement('div');
    summary.className = 'response-summary';
    
    // Calculate average and standard deviation
    const average = calculateAverage(questionResponses);
    const stdDev = calculateStdDev(questionResponses);
    
    summary.innerHTML = `
        <h5>Summary:</h5>
        <p>Total Responses: ${total}</p>
        <p>Average Value: ${average.toFixed(2)}</p>
        <p>Standard Deviation: ${stdDev.toFixed(2)}</p>
        <p>Interpretation: ${getStdDevInterpretation(stdDev)}</p>
    `;
    continuumStats.appendChild(summary);
    
    // Add styles if not already added
    if (!document.getElementById('distribution-styles')) {
        const style = document.createElement('style');
        style.id = 'distribution-styles';
        style.textContent = `
            .distribution-container {
                margin: 20px 0;
            }
            .distribution-bar {
                display: flex;
                height: 30px;
                width: 100%;
                border-radius: 4px;
                overflow: hidden;
            }
            .distribution-segment {
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                min-width: 30px;
            }
            .neg-two { background-color: #d32f2f; }
            .neg-one { background-color: #f44336; }
            .pos-one { background-color: #4caf50; }
            .pos-two { background-color: #2e7d32; }
            .distribution-labels {
                display: flex;
                justify-content: space-between;
                margin-top: 5px;
                font-size: 0.8rem;
            }
            .dont-understand-stat {
                margin-top: 20px;
                padding: 10px;
                background-color: #f5f5f5;
                border-radius: 4px;
            }
            .response-summary {
                margin-top: 20px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add "Back to Overview" button
    const backButton = document.createElement('button');
    backButton.className = 'btn secondary';
    backButton.textContent = 'Back to Overview';
    backButton.onclick = function() {
        hideDetails();
    };
    
    continuumStats.appendChild(backButton);
}

// Helper function to hide details view
function hideDetails() {
    if (continuumDetails) {
        continuumDetails.style.display = 'none';
        continuumDetails.classList.add('hidden');
    } else {
        console.error('continuumDetails element not found in hideDetails function');
    }
}

// Helper function to calculate average for a set of responses
function calculateAverage(responses) {
    let sum = 0;
    let count = 0;
    
    responses.forEach(response => {
        if (response.likert_value !== null) {
            sum += response.likert_value;
            count++;
        }
    });
    
    return count > 0 ? sum / count : 0;
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
    // Check if we're on localhost instead of using process.env
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
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

// Helper function to calculate standard deviation for a set of responses
function calculateStdDev(responses) {
    // First calculate average
    const avg = calculateAverage(responses);
    
    // If no valid responses or only one response, std dev is 0
    const validResponses = responses.filter(r => r.likert_value !== null);
    if (validResponses.length <= 1) {
        return 0;
    }
    
    // Calculate sum of squared differences
    let sumSquaredDiffs = 0;
    validResponses.forEach(response => {
        const diff = response.likert_value - avg;
        sumSquaredDiffs += diff * diff;
    });
    
    // Calculate variance (average of squared differences)
    const variance = sumSquaredDiffs / validResponses.length;
    
    // Return standard deviation (square root of variance)
    return Math.sqrt(variance);
}

// Helper function to provide an interpretation of the standard deviation
function getStdDevInterpretation(stdDev) {
    if (stdDev < 0.5) {
        return "High agreement among respondents";
    } else if (stdDev < 1.0) {
        return "Moderate agreement among respondents";
    } else if (stdDev < 1.5) {
        return "Some disagreement among respondents";
    } else {
        return "Strong disagreement among respondents";
    }
} 