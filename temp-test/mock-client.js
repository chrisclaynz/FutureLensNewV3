
    // Mock client
    export const supabase = {
      from: (table) => ({
        select: (columns) => ({
          eq: (field, value) => ({
            data: [
              {
                id: 1,
                question: 'Mock Question 1',
                options: ['Option A', 'Option B', 'Option C']
              },
              {
                id: 2,
                question: 'Mock Question 2',
                options: ['Option X', 'Option Y', 'Option Z']
              }
            ],
            error: null
          })
        })
      })
    };
  