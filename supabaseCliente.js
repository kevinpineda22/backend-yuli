import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();  // Esto carga las variables de entorno

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL y SUPABASE_KEY son requeridos.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
