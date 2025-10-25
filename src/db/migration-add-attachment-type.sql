-- Add type column to attachments table to differentiate between file and url
ALTER TABLE attachments ADD COLUMN type TEXT DEFAULT 'file' CHECK(type IN ('file', 'url'));
