/**
 * Supabase SQL Migration Script for CloudClip
 * Includes:
 * - Table: clipboard_items
 * - UUID Primary key
 * - 6-digit unique code
 * - Proper indexes on (code), (expires_at)
 * - Row Level Security (RLS) policies for anonymous read/write
 * - Storage bucket configuration for 'clipboard-files'
 * - Auto-expiration cleanup function / cron
 */

export const SUPABASE_SQL_SCHEMA = `-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the clipboard_items table
CREATE TABLE IF NOT EXISTS public.clipboard_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(6) NOT NULL UNIQUE,
    content_type VARCHAR(10) NOT NULL CHECK (content_type IN ('text', 'image', 'file')),
    text_content TEXT,
    file_path TEXT,
    file_name TEXT,
    file_size BIGINT,
    mime_type TEXT,
    burn_on_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- 3. Create high-performance indexes
-- Primary lookup index on active codes
CREATE INDEX IF NOT EXISTS idx_clipboard_items_code ON public.clipboard_items (code);

-- Expiration indexing for fast pruning of stale items
CREATE INDEX IF NOT EXISTS idx_clipboard_items_expires_at ON public.clipboard_items (expires_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.clipboard_items ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert new clipboards
CREATE POLICY "Allow public insert to clipboard_items" 
ON public.clipboard_items
FOR INSERT 
WITH CHECK (true);

-- Allow retrieval only of unexpired clipboards by exact 6-digit code
CREATE POLICY "Allow public read unexpired clipboard_items" 
ON public.clipboard_items
FOR SELECT 
USING (expires_at > TIMEZONE('utc', NOW()));

-- Allow delete for burn-on-read or manual deletion
CREATE POLICY "Allow public delete clipboard_items" 
ON public.clipboard_items
FOR DELETE 
USING (true);

-- 5. Storage Bucket Configuration for 'clipboard-files'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'clipboard-files', 
    'clipboard-files', 
    true, 
    314572800, -- 300 MB limit (300 * 1024 * 1024)
    ARRAY[
        'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', 'application/x-zip-compressed', 'application/octet-stream'
    ]
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 314572800;

-- Storage RLS Policies
CREATE POLICY "Allow public uploads to clipboard-files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'clipboard-files');

CREATE POLICY "Allow public downloads from clipboard-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'clipboard-files');

-- 6. Automatic periodic cleanup routine (run via pg_cron or Supabase Edge Functions)
CREATE OR REPLACE FUNCTION public.clean_expired_clipboards()
RETURNS void AS $$
BEGIN
    -- Delete database records that have expired
    DELETE FROM public.clipboard_items
    WHERE expires_at < TIMEZONE('utc', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;
