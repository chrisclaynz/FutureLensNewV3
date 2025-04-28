import { supabase } from '../client.js';

// RLS-compliant query helpers
// These functions ensure that queries respect Row Level Security policies

/**
 * Safely fetch a survey by ID with RLS consideration
 * 
 * @param {string} surveyId - The ID of the survey to fetch
 * @returns {Promise<Object>} - The survey data or error
 */
export async function fetchSurveyById(surveyId) {
    try {
        const { data, error } = await supabase
            .from('surveys')
            .select('id, json_config')
            .eq('id', surveyId)
            .single();
        
        if (error) {
            if (error.message.includes('permission denied')) {
                return { 
                    data: null, 
                    error: { 
                        message: 'Access denied - you do not have permission to view this survey', 
                        isRlsError: true 
                    } 
                };
            }
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (error) {
        return { 
            data: null, 
            error: { message: 'An unexpected error occurred', originalError: error }
        };
    }
}

/**
 * Safely fetch all surveys with RLS considerations
 * 
 * @returns {Promise<Object>} - Survey list and/or error information
 */
export async function fetchAllSurveys() {
    try {
        const { data, error } = await supabase
            .from('surveys')
            .select('id, json_config->theme->title, inserted_at')
            .order('inserted_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching surveys:', error);
            
            // Check if this is an RLS-related error
            if (error.code === '42501' || error.message.includes('permission denied')) {
                console.warn('RLS denied access to surveys list');
                return { 
                    data: null, 
                    error: { 
                        message: 'Access denied',
                        isRlsError: true,
                        originalError: error
                    } 
                };
            }
            
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (error) {
        console.error('Unexpected error fetching surveys:', error);
        return { 
            data: null, 
            error: { 
                message: 'Unexpected error occurred',
                originalError: error
            } 
        };
    }
}

/**
 * Create a new survey (requires authentication)
 * 
 * @param {Object} surveyConfig - The survey configuration
 * @returns {Promise<Object>} - The created survey ID or error
 */
export async function createSurvey(surveyConfig) {
    try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            return {
                data: null,
                error: {
                    message: 'You must be logged in to create a survey',
                    isAuthError: true
                }
            };
        }
        
        const { data, error } = await supabase
            .from('surveys')
            .insert({ json_config: surveyConfig })
            .select('id');
        
        if (error) {
            if (error.message.includes('permission denied')) {
                return { 
                    data: null, 
                    error: { 
                        message: 'Permission denied - you do not have rights to create surveys', 
                        isRlsError: true 
                    } 
                };
            }
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (error) {
        return { 
            data: null, 
            error: { message: 'An unexpected error occurred', originalError: error }
        };
    }
}

// Export debugging helpers
export const RlsDebug = {
    enabled: false,
    
    // Enable RLS debugging
    enable() {
        this.enabled = true;
        console.log('[RLS Debug] Enabled');
    },
    
    // Disable RLS debugging
    disable() {
        this.enabled = false;
    },
    
    // Log RLS-related information
    log(...args) {
        if (this.enabled) {
            console.log('[RLS Debug]', ...args);
        }
    }
}; 