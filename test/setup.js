import { jest } from '@jest/globals';

// Mock import.meta.env
global.import = {
    meta: {
        env: {
            VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
            VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
        }
    }
};

// Mock Supabase client
const mockFrom = jest.fn(() => ({
    select: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockResolvedValue({ data: [], error: null }),
    delete: jest.fn().mockResolvedValue({ data: [], error: null }),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null })
}));

const mockAuth = {
    signUp: jest.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user-id' } }, 
        error: null 
    }),
    signOut: jest.fn().mockResolvedValue({ error: null })
};

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: mockFrom,
        auth: mockAuth
    }))
}));

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock window and document
global.window = {
    location: {
        href: ''
    },
    localStorage: localStorageMock
};

global.document = {
    addEventListener: jest.fn(),
    getElementById: jest.fn(() => ({
        addEventListener: jest.fn()
    }))
}; 