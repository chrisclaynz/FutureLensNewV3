-- Create participants table
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    cohort_id UUID REFERENCES public.cohorts(id),
    survey_id UUID REFERENCES public.surveys(id),
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create responses table
CREATE TABLE IF NOT EXISTS public.responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.participants(id),
    question_key TEXT NOT NULL,
    likert_value INTEGER,
    dont_understand BOOLEAN DEFAULT false,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create surveys table
CREATE TABLE IF NOT EXISTS public.surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    json_config JSONB NOT NULL,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create cohorts table
CREATE TABLE IF NOT EXISTS public.cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security on all tables
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

-- Participants RLS Policies
CREATE POLICY "Users can only view their own participant records"
ON public.participants
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own participant records"
ON public.participants
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Responses RLS Policies
CREATE POLICY "Users can only view their own responses"
ON public.responses
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.participants 
        WHERE participants.id = responses.participant_id 
        AND participants.user_id = auth.uid()
    )
);

CREATE POLICY "Users can only insert their own responses"
ON public.responses
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.participants 
        WHERE participants.id = responses.participant_id 
        AND participants.user_id = auth.uid()
    )
);

-- Surveys RLS Policies
CREATE POLICY "Anyone can view surveys"
ON public.surveys
FOR SELECT
USING (true);

CREATE POLICY "Only authenticated users can insert surveys"
ON public.surveys
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Cohorts RLS Policies
CREATE POLICY "Anyone can view cohorts"
ON public.cohorts
FOR SELECT
USING (true);

CREATE POLICY "Only authenticated users can insert cohorts"
ON public.cohorts
FOR INSERT
WITH CHECK (auth.role() = 'authenticated'); 