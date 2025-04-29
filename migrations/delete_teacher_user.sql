-- Delete the existing teacher user and their identity
DELETE FROM auth.identities WHERE user_id = 'eb9b5a56-d881-4a51-9737-88bd4ade073d';
DELETE FROM auth.users WHERE id = 'eb9b5a56-d881-4a51-9737-88bd4ade073d'; 