async function checkJobs() {
  const schemaRes = await fetch("https://rrypxbkipixmuufzkdxp.supabase.co/rest/v1/", {
    headers: {
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyeXB4YmtpcGl4bXV1ZnprZHhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMwNDIxMCwiZXhwIjoyMDk2ODgwMjEwfQ.d2tKLpRWKaTzb4S0RR9RWR_3aWFXpC6QEaPieSCbsbo",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyeXB4YmtpcGl4bXV1ZnprZHhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMwNDIxMCwiZXhwIjoyMDk2ODgwMjEwfQ.d2tKLpRWKaTzb4S0RR9RWR_3aWFXpC6QEaPieSCbsbo",
      "Accept": "application/openapi+json"
    }
  });
  const schema = await schemaRes.json();
  const def = schema?.definitions?.jobs;
  if (def) {
    console.log("Jobs status enum:", def.properties.status);
    console.log("Jobs properties:", Object.keys(def.properties || {}));
  }
}
checkJobs();
