-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rows INTEGER NOT NULL DEFAULT 3,
    columns INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add RLS policies
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own templates
CREATE POLICY "Users can view their own templates"
    ON templates FOR SELECT
    USING (auth.uid() = user_id);

-- Policy to allow users to insert their own templates
CREATE POLICY "Users can insert their own templates"
    ON templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own templates
CREATE POLICY "Users can update their own templates"
    ON templates FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own templates
CREATE POLICY "Users can delete their own templates"
    ON templates FOR DELETE
    USING (auth.uid() = user_id);

-- Create a default template for the event
INSERT INTO templates (event_id, name, rows, columns, user_id)
SELECT 
    '828558be-8ef3-4cd7-9557-470421188e41', -- Your event ID
    'Default Template',
    3,
    3,
    auth.uid()
WHERE NOT EXISTS (
    SELECT 1 FROM templates WHERE event_id = '828558be-8ef3-4cd7-9557-470421188e41'
); 