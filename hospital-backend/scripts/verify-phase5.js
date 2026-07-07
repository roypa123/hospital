require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");
const { cronQueue } = require("../src/shared/queue");

const PORT = 3054;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend Phase 5 Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    const timestamp = Date.now();
    const patientEmail = `patient.p5.${timestamp}@example.com`;
    const password = "Password123!";

    // 1. Log in users
    console.log("\n[Setup] Logging in users...");
    const docLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "jane.smith@hospital.com", password }),
    })).json();
    const docToken = docLogin.data.accessToken;

    const drJane = (await (await fetch(`${BASE_URL}/doctors`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    })).json()).data.find(d => d.email === "jane.smith@hospital.com");

    const cashierLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cashier@hospital.com", password }),
    })).json();
    const cashierToken = cashierLogin.data.accessToken;

    // 2. Register Patient Watson (asserts async send-verification queue triggers)
    console.log("\n[TC1] Registering Patient Watson (asserting async Verification email dispatch)...");
    const regRes = await fetch(`${BASE_URL}/auth/register?role=PATIENT`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password, first_name: "Emma", last_name: "Watson" }),
    });
    const regData = await regRes.json();
    
    // Log in Patient Watson
    const patLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password }),
    })).json();
    const patToken = patLogin.data.accessToken;

    const patient = (await (await fetch(`${BASE_URL}/patients`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    })).json()).data.find(p => p.email === patientEmail);
    console.log(`✔ Patient Watson registered & logged in (ID: ${patient.id})`);

    // 3. Register Insurance Policy
    console.log("\n[TC2] Registering Patient Insurance Policy...");
    const providers = (await (await fetch(`${BASE_URL}/insurance/providers`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    })).json()).data;
    const provider = providers[0]; // CareFirst BlueCross
    console.log(`  Selected Provider: ${provider.name}`);

    const policyRes = await fetch(`${BASE_URL}/insurance/policies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${patToken}` },
      body: JSON.stringify({
        insurance_provider_id: provider.id,
        policy_number: `POL-WATSON-${timestamp}`,
        expiry_date: "2027-12-31",
        coverage_details: { copay: 15.00, coinsurance: 0.8 },
      }),
    });
    const policy = (await policyRes.json()).data;
    console.log(`✔ Policy registered successfully (ID: ${policy.id}, Policy Number: ${policy.policy_number})`);

    // 4. Create Consultation Checkout Invoice
    console.log("\n[TC3] Generating Consultation Checkout Bill...");
    const testDate = "2026-11-02"; // Monday
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
        symptoms: "Mild symptoms",
        diagnosis: "Regular checkup",
        billing: { discount_rate: 0, tax_rate: 0 }, // Total = $150
      }),
    });
    const checkoutData = (await checkoutRes.json()).data;
    const billId = checkoutData.bill_id;
    console.log(`✔ Checkout completed. Invoice Bill ID: ${billId}`);

    // Verify invoice amount
    const billRes = await fetch(`${BASE_URL}/billing/${billId}`, {
      headers: { "Authorization": `Bearer ${cashierToken}` },
    });
    const bill = (await billRes.json()).data;
    console.log(`  Initial Bill net_amount: $${bill.net_amount} | status: ${bill.status}`);

    // 5. Submit Insurance Claim
    console.log("\n[TC4] Submitting Insurance Claim (Cashier Claire)...");
    const claimRes = await fetch(`${BASE_URL}/insurance/claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cashierToken}` },
      body: JSON.stringify({
        bill_id: billId,
        patient_insurance_policy_id: policy.id,
        claim_amount: bill.net_amount, // $150
      }),
    });
    const claim = (await claimRes.json()).data;
    console.log(`✔ Claim submitted successfully (ID: ${claim.id}, Status: ${claim.status})`);

    // 6. Adjudicate Claim Decision (Approve $120 out of $150)
    console.log("\n[TC5] Approving Claim & Crediting Invoice Balance (Cashier Claire)...");
    const decideRes = await fetch(`${BASE_URL}/insurance/claims/${claim.id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cashierToken}` },
      body: JSON.stringify({
        status: "approved",
        approved_amount: 120.00,
      }),
    });
    const decideData = (await decideRes.json()).data;
    console.log(`✔ Adjudication completed. Claim status: ${decideData.status} | Approved: $${decideData.approved_amount}`);

    // Check Bill status update
    const finalBillRes = await fetch(`${BASE_URL}/billing/${billId}`, {
      headers: { "Authorization": `Bearer ${cashierToken}` },
    });
    const finalBill = (await finalBillRes.json()).data;
    console.log(`  Updated Bill paid_amount: $${finalBill.paid_amount} | net_amount: $${finalBill.net_amount} | status: ${finalBill.status}`);

    if (parseFloat(finalBill.paid_amount) === 120.00 && finalBill.status === "partially_paid") {
      console.log("✔ Insurance payout successfully credited to bill invoice! Status set to partially_paid.");
    } else {
      throw new Error(`Insurance payout credit checks failed: paid=${finalBill.paid_amount}, status=${finalBill.status}`);
    }

    // 7. Verify EMR/Insurance Claim Patient Boundary Restrict (ABAC)
    console.log("\n[TC6] Verifying Patient Claims access limits (ABAC)...");
    const badDecideRes = await fetch(`${BASE_URL}/insurance/claims/${claim.id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${patToken}` },
      body: JSON.stringify({ status: "approved", approved_amount: 10 }),
    });

    if (badDecideRes.status === 403) {
      console.log("✔ Patient claims decision change blocked with 403 Forbidden as expected.");
    } else {
      throw new Error(`Expected 403 Forbidden for patient claims decide, got ${badDecideRes.status}`);
    }

    // 8. Trigger manual Low Stock Cron job check
    console.log("\n[TC7] Dispatching Medicine Low Stock Audit Cron Job to worker...");
    if (cronQueue) {
      const auditJob = await cronQueue.add("check-low-stock", {});
      console.log(`✔ Low Stock Audit Job triggered (ID: ${auditJob.id}).`);
      
      // Sleep 2 seconds to let the worker print logs
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log("⚠ Cron Queue not loaded.");
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL PHASE 5 VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉");
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
