import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SECRET_SUPABASE_SERVICE_ROLE } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SECRET_SUPABASE_SERVICE_ROLE);
