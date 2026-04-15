import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://pcktdtbcamcdjcajaegr.supabase.co";
const supabaseKey = "sb_publishable_PbPeV03RSeKuHM54unI0Wg_78yfxacL";

export const supabase = createClient(supabaseUrl, supabaseKey);