const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://rrypxbkipixmuufzkdxp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyeXB4YmtpcGl4bXV1ZnprZHhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMwNDIxMCwiZXhwIjoyMDk2ODgwMjEwfQ.d2tKLpRWKaTzb4S0RR9RWR_3aWFXpC6QEaPieSCbsbo"
);

async function cleanTest() {
  const { data, error } = await supabase
    .from("jobs")
    .delete()
    .eq("title", "Test Job from Template");
  console.log("Deleted test jobs:", data, error);
}

cleanTest();
