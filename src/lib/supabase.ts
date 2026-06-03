import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://adorzqjhazsfvbttlfht.supabase.co';
const supabaseKey = 'sb_publishable_b098wEy_wai6_RWuR5pV7g_IAw-x86p';

export const supabase = createClient(supabaseUrl, supabaseKey);
