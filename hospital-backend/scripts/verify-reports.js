require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");

const PORT = 3063;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend Management Reports Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    const timestamp = Date.now();
    const patientEmail = `patient.report.${timestamp}@example.com`;
    const password = "Password123!";

    // 1. Log in users
    console.log("\n[Setup] Authenticating users...");
    
    // Admin (seeded)
    const adminLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@hospital.com", password }),
    })).json();
    const adminToken = adminLogin.data.accessToken;

    // Doctor Jane (seeded)
    const docLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "jane.smith@hospital.com", password }),
    })).json();
    const docToken = docLogin.data.accessToken;

    // Cashier (seeded)
    const cashierLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cashier@hospital.com", password }),
    })).json();
    const cashierToken = cashierLogin.data.accessToken;

    // Patient Emma Watson (register & login)
    await fetch(`${BASE_URL}/auth/register?role=PATIENT`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password, first_name: "Emma", last_name: "Watson" }),
    });

    const patLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password }),
    })).json();
    const patToken = patLogin.data.accessToken;

    console.log("✔ Sockets/Auth configurations resolved. Users logged in.");

    // 2. Fetch Financial Report in JSON format
    console.log("\n[TC1] Requesting Financial Report in JSON format...");
    const finRes = await fetch(`${BASE_URL}/reports/financial`, {
      headers: { "Authorization": `Bearer ${cashierToken}` },
    });
    const finData = await finRes.json();
    console.log(`  Financial JSON report response status: ${finRes.status}`);
    console.log(`  Summary: Total net billed: $${finData.data.summary.total_net} | Paid: $${finData.data.summary.total_paid}`);

    if (finRes.status === 200 && finData.success) {
      console.log("✔ Financial JSON report successfully fetched.");
    } else {
      throw new Error(`Failed to fetch JSON report: ${JSON.stringify(finData)}`);
    }

    // 3. Fetch Financial Report in CSV format
    console.log("\n[TC2] Requesting Financial Report in CSV format (?format=csv)...");
    const finCsvRes = await fetch(`${BASE_URL}/reports/financial?format=csv`, {
      headers: { "Authorization": `Bearer ${cashierToken}` },
    });
    console.log(`  CSV Response Content-Type: ${finCsvRes.headers.get("content-type")}`);
    console.log(`  CSV Response Content-Disposition: ${finCsvRes.headers.get("content-disposition")}`);
    
    const finCsv = await finCsvRes.text();
    const firstLineFin = finCsv.split("\r\n")[0];
    console.log(`  CSV Header line: "${firstLineFin}"`);

    if (
      finCsvRes.status === 200 &&
      finCsvRes.headers.get("content-type").includes("text/csv") &&
      firstLineFin.includes("Bill ID,Patient Name")
    ) {
      console.log("✔ Financial CSV report successfully generated and streamed for download.");
    } else {
      throw new Error("Financial CSV format check failed");
    }

    // 4. Fetch Clinical Report in CSV format
    console.log("\n[TC3] Requesting Clinical Report in CSV format (?format=csv)...");
    const cliCsvRes = await fetch(`${BASE_URL}/reports/clinical?format=csv`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    const cliCsv = await cliCsvRes.text();
    const firstLineCli = cliCsv.split("\r\n")[0];
    console.log(`  Clinical CSV Header: "${firstLineCli}"`);

    if (cliCsvRes.status === 200 && firstLineCli.includes("Doctor ID,Doctor Name")) {
      console.log("✔ Clinical CSV report successfully generated and streamed.");
    } else {
      throw new Error("Clinical CSV format check failed");
    }

    // 5. Fetch Inventory Report in JSON and CSV formats
    console.log("\n[TC4] Requesting Inventory Report in JSON & CSV formats...");
    const invRes = await fetch(`${BASE_URL}/reports/inventory`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    });
    const invData = await invRes.json();
    console.log(`  Inventory JSON list length: ${invData.data.length} medicines`);

    const invCsvRes = await fetch(`${BASE_URL}/reports/inventory?format=csv`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    });
    const invCsv = await invCsvRes.text();
    const firstLineInv = invCsv.split("\r\n")[0];
    console.log(`  Inventory CSV Header: "${firstLineInv}"`);

    if (invRes.status === 200 && invCsvRes.status === 200 && firstLineInv.includes("Medicine ID,Medicine Name")) {
      console.log("✔ Inventory reports generated successfully.");
    } else {
      throw new Error("Inventory reports check failed");
    }

    // 6. Test RBAC blocks on reports for patients
    console.log("\n[TC5] Testing RBAC restrictions (Patient Watson attempting to query reports)...");
    const badRes = await fetch(`${BASE_URL}/reports/financial`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    });
    console.log(`  Patient access attempt response status: ${badRes.status}`);

    if (badRes.status === 403) {
      console.log("✔ Access blocked with 403 Forbidden as expected.");
    } else {
      throw new Error(`Expected 403 Forbidden for patient reporting access, got ${badRes.status}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL REPORTS MODULE VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉");
    console.log("=======================================================");

  } catch (error) {
    console.error("\n❌ VERIFICATION TEST FAILED:");
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    // Shutdown
    await db.destroy();
    server.close(() => {
      console.log("Verification test server shut down.");
    });
  }
}

runTests();
