import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

describe('Supabase Integration', () => {
  let supabase;

  beforeEach(() => {
    // Initialize Supabase client with environment variables
    supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
  });

  test('should be able to get session', async () => {
    // Mock the auth.getSession method
    supabase.auth.getSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null
    });

    const { data, error } = await supabase.auth.getSession();
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.session).toBeNull(); // No active session by default
  });
}); 