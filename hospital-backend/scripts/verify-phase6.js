require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");

const PORT = 3055;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend Phase 6 Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    const timestamp = Date.now();
    const patientEmail = `patient.p6.${timestamp}@example.com`;
    const password = "Password123!";

    // 1. Log in users
    console.log("\n[Setup] Logging in users...");
    
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

    const drJane = (await (await fetch(`${BASE_URL}/doctors`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    })).json()).data.find(d => d.email === "jane.smith@hospital.com");

    // Cashier (seeded)
    const cashierLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cashier@hospital.com", password }),
    })).json();
    const cashierToken = cashierLogin.data.accessToken;

    // Patient Watson (register & login)
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

    const patient = (await (await fetch(`${BASE_URL}/patients`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    })).json()).data.find(p => p.email === patientEmail);

    console.log(`✔ Users authenticated. Patient Watson loaded (ID: ${patient.id})`);

    // 2. Register insurance policy
    console.log("\n[Setup] Setting up Watson insurance policy...");
    const providers = (await (await fetch(`${BASE_URL}/insurance/providers`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    })).json()).data;
    const provider = providers.find(p => p.name.includes("BlueCross"));

    const policyRes = await fetch(`${BASE_URL}/insurance/policies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${patToken}` },
      body: JSON.stringify({
        insurance_provider_id: provider.id,
        policy_number: `POL-P6-${timestamp}`,
        expiry_date: "2028-12-31",
      }),
    });
    const policy = (await policyRes.json()).data;

    // 3. Book slot & Checkout visit (EMR + signed prescriptions + bills)
    console.log("\n[Setup] Booking slot and conducting checkout visit...");
    const testDate = "2026-11-09"; // Monday
    await fetch(`${BASE_URL}/appointments/slots/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${docToken}` },
      body: JSON.stringify({ doctor_id: drJane.id, date: testDate }),
    });

    const slots = (await (await fetch(`${BASE_URL}/appointments/slots?doctor_id=${drJane.id}&date=${testDate}`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    })).json()).data;
    const targetSlot = slots.find(s => s.status === "available");

    const bookRes = await fetch(`${BASE_URL}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${patToken}` },
      body: JSON.stringify({ doctor_id: drJane.id, slot_id: targetSlot.id }),
    });
    const appointmentId = (await bookRes.json()).data.id;

    // Checkout
    const checkoutRes = await fetch(`${BASE_URL}/billing/checkout/${appointmentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${docToken}` },
      body: JSON.stringify({
        symptoms: "Fatigue, fever.",
        diagnosis: "Influenza B",
        vital_signs: { blood_pressure: "120/80", heart_rate: 80, temperature: 38.5 },
        billing: { discount_rate: 0, tax_rate: 0 }, // $150.00 total
      }),
    });
    const checkout = (await checkoutRes.json()).data;

    // 4. Submit & Approve claim for $120.00
    console.log("\n[Setup] Submitting and approving insurance claim ($120.00 credit)...");
    const claimRes = await fetch(`${BASE_URL}/insurance/claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cashierToken}` },
      body: JSON.stringify({
        bill_id: checkout.bill_id,
        patient_insurance_policy_id: policy.id,
        claim_amount: 150.00,
      }),
    });
    const claim = (await claimRes.json()).data;

    await fetch(`${BASE_URL}/insurance/claims/${claim.id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cashierToken}` },
      body: JSON.stringify({ status: "approved", approved_amount: 120.00 }),
    });

    // 5. TC1: Verify Doctor Dashboard
    console.log("\n[TC1] Testing Doctor Dashboard API metrics...");
    const docDashRes = await fetch(`${BASE_URL}/dashboard/doctor`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    const docDash = (await docDashRes.json()).data;
    console.log(`  Completed consultations count: ${docDash.summary.completed_appointments}`);
    console.log(`  Pending lab reviews count: ${docDash.summary.pending_lab_reviews}`);

    if (docDash.summary.completed_appointments >= 1) {
      console.log("✔ Doctor console metrics verified successfully.");
    } else {
      throw new Error(`Doctor summary completed consults should be >= 1, got ${docDash.summary.completed_appointments}`);
    }

    // 6. TC2: Verify Patient Dashboard Vitals trends
    console.log("\n[TC2] Testing Patient Dashboard vitals trends chart data...");
    const patDashRes = await fetch(`${BASE_URL}/dashboard/patient`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    });
    const patDash = (await patDashRes.json()).data;
    console.log(`  Active visit count: ${patDash.summary.total_visits}`);
    console.log(`  Unpaid invoices count: ${patDash.summary.unpaid_bills_count}`);
    console.log(`  Clinical Vitals trends logs entries count: ${patDash.vitals_trends.length}`);
    
    if (patDash.vitals_trends.length > 0) {
      const entry = patDash.vitals_trends[0];
      console.log(`  Audited vital entry BP: ${entry.blood_pressure} | Temp: ${entry.temperature}°C | HR: ${entry.heart_rate} bpm`);
      if (entry.blood_pressure === "120/80" && parseFloat(entry.temperature) === 38.5) {
        console.log("✔ Chronological vital signs trends mapped perfectly.");
      } else {
        throw new Error("Vitals parameters mismatch");
      }
    } else {
      throw new Error("Vitals trends empty");
    }

    // 7. TC3: Verify Admin Dashboard Financial summary
    console.log("\n[TC3] Testing Admin Dashboard Financial summary report...");
    const adminDashRes = await fetch(`${BASE_URL}/dashboard/admin`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    });
    const adminDash = (await adminDashRes.json()).data;
    
    console.log(`  Overall Patients registered: ${adminDash.overview.total_patients}`);
    console.log(`  Invoiced Total billed: $${adminDash.financials.total_billed}`);
    console.log(`  Invoiced Net amount: $${adminDash.financials.total_net}`);
    console.log(`  Received Payments: $${adminDash.financials.total_paid}`);
    console.log(`  Outstanding due balance: $${adminDash.financials.total_outstanding}`);

    if (adminDash.financials.total_paid >= 120.00 && adminDash.overview.total_patients >= 1) {
      console.log("✔ Admin financials summaries aggregated successfully.");
    } else {
      throw new Error("Admin metrics check failed");
    }

    // 8. TC4: Verify Patient RBAC blocks to Admin reports (ABAC)
    console.log("\n[TC4] Testing RBAC restriction on Admin reports for Patient Watson...");
    const badAdminDashRes = await fetch(`${BASE_URL}/dashboard/admin`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    });

    if (badAdminDashRes.status === 403) {
      console.log("✔ Patient block from Admin reports with 403 Forbidden verified.");
    } else {
      throw new Error(`Expected 403 Forbidden for patient admin dashboard access, got ${badAdminDashRes.status}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL PHASE 6 VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉");
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
