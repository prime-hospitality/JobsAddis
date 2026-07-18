const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://rrypxbkipixmuufzkdxp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyeXB4YmtpcGl4bXV1ZnprZHhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMwNDIxMCwiZXhwIjoyMDk2ODgwMjEwfQ.d2tKLpRWKaTzb4S0RR9RWR_3aWFXpC6QEaPieSCbsbo"
);

async function testInsert() {
  let { data: platformEmployer } = await supabase
    .from("employers")
    .select("id")
    .eq("business_name", "Addis Jobs")
    .maybeSingle();

  console.log("Platform employer:", platformEmployer);

  const { error: jobErr } = await supabase.from("jobs").insert({
    employer_id: platformEmployer.id,
    title: "Test Job from Template",
    category: "Other",
    location: "Addis Ababa",
    neighborhood: "Addis Ababa",
    job_type: "Full Time",
    salary_min: 0,
    salary_max: 0,
    currency: "ETB",
    description: "Test description",
    full_description: "Test description",
    requirements: {
      experience: "Entry Level",
      education: "",
      languages: [],
      locationPreference: null,
      workingHours: null,
    },
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    quantity: 1,
    status: "active",
  });

  if (jobErr) {
    console.error("Job insert failed:", JSON.stringify(jobErr, null, 2));
  } else {
    console.log("Job inserted successfully!");
  }
}

testInsert();
