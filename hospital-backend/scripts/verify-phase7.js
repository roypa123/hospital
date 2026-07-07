require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");

const PORT = 3056;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend Phase 7 Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    const timestamp = Date.now();
    const patientEmail = `patient.p7.${timestamp}@example.com`;
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

    // 2. Register Patient Watson (triggers USER_REGISTER audit)
    console.log("\n[TC1] Registering Patient Watson (asserting USER_REGISTER audit dispatch)...");
    const regRes = await fetch(`${BASE_URL}/auth/register?role=PATIENT`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password, first_name: "Emma", last_name: "Watson" }),
    });
    const regData = await regRes.json();
    
    // Log in Patient Watson (triggers USER_LOGIN audit)
    const patLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password }),
    })).json();
    const patToken = patLogin.data.accessToken;

    const patient = (await (await fetch(`${BASE_URL}/patients`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    })).json()).data.find(p => p.email === patientEmail);
    console.log(`✔ Patient Watson loaded (ID: ${patient.id})`);

    // 3. Register insurance policy
    const providers = (await (await fetch(`${BASE_URL}/insurance/providers`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    })).json()).data;
    const provider = providers.find(p => p.name.includes("BlueCross"));

    const policyRes = await fetch(`${BASE_URL}/insurance/policies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${patToken}` },
      body: JSON.stringify({
        insurance_provider_id: provider.id,
        policy_number: `POL-P7-${timestamp}`,
        expiry_date: "2028-12-31",
      }),
    });
    const policy = (await policyRes.json()).data;

    // 4. Book slot (triggers APPOINTMENT_BOOKED audit)
    console.log("\n[TC2] Booking slot (asserting APPOINTMENT_BOOKED audit)...");
    const testDate = "2026-11-16"; // Monday
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
    console.log(`✔ Appointment booked (ID: ${appointmentId})`);

    // 5. Checkout visit (triggers CONSULTATION_CHECKOUT audit)
    console.log("\n[TC3] Concluding consultation checkout (asserting CONSULTATION_CHECKOUT audit)...");
    const checkoutRes = await fetch(`${BASE_URL}/billing/checkout/${appointmentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${docToken}` },
      body: JSON.stringify({
        symptoms: "Headache and fever.",
        diagnosis: "Migraine",
        vital_signs: { blood_pressure: "120/80", heart_rate: 80, temperature: 37.5 },
        billing: { discount_rate: 0, tax_rate: 0 }, // $150.00 total
      }),
    });
    const checkout = (await checkoutRes.json()).data;
    console.log(`✔ Checkout completed. Invoice Bill ID: ${checkout.bill_id}`);

    // 6. Submit & Approve claim (triggers CLAIM_ADJUDICATED audit)
    console.log("\n[TC4] Submitting and approving claim (asserting CLAIM_ADJUDICATED audit)...");
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

    // 7. Pay outstanding balance (triggers INVOICE_PAYMENT audit)
    console.log("\n[TC5] Paying outstanding balance (asserting INVOICE_PAYMENT audit)...");
    await fetch(`${BASE_URL}/billing/${checkout.bill_id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cashierToken}` },
      body: JSON.stringify({ amount: 30.00, payment_method: "cash" }),
    });

    // 8. Wait 3 seconds for BullMQ workers to process all logs in Redis
    console.log("\nWaiting for BullMQ audit queue worker to process jobs in the background...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 9. Query Audit logs as Admin
    console.log("\n[TC6] Querying Admin Audit Logs trail API...");
    const auditRes = await fetch(`${BASE_URL}/audit-logs`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    const logs = auditData.data;

    console.log(`  Total audit trails entries retrieved: ${logs.length}`);
    
    // Assert audit event coverage
    const actions = logs.map(l => l.action);
    console.log("  Recorded actions in audit trail:", Array.from(new Set(actions)).join(", "));

    const requiredActions = [
      "USER_REGISTER",
      "USER_LOGIN",
      "APPOINTMENT_BOOKED",
      "CONSULTATION_CHECKOUT",
      "CLAIM_ADJUDICATED",
      "INVOICE_PAYMENT"
    ];

    for (const action of requiredActions) {
      if (actions.includes(action)) {
        const logEntry = logs.find(l => l.action === action);
        console.log(`  ✔ Found: ${action} | IP recorded: ${logEntry.ip_address} | User ID: ${logEntry.user_id || "null"}`);
      } else {
        throw new Error(`Audit trail is missing action: ${action}`);
      }
    }

    // 10. Verify RBAC restrictions
    console.log("\n[TC7] Testing RBAC restriction on Audit Logs for Patient Watson...");
    const badAuditRes = await fetch(`${BASE_URL}/audit-logs`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    });

    if (badAuditRes.status === 403) {
      console.log("✔ Patient block from Audit Trails with 403 Forbidden verified.");
    } else {
      throw new Error(`Expected 403 Forbidden for patient audit logs access, got ${badAuditRes.status}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL PHASE 7 VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉");
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
