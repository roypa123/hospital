require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");

const PORT = 3053;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend Phase 4 Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    const timestamp = Date.now();
    const patientEmail = `patient.p4.${timestamp}@example.com`;
    const password = "Password123!";

    // 1. Log in all users
    console.log("\n[Setup] Logging in staff and doctor...");
    
    // Doctor Jane
    const docToken = (await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "jane.smith@hospital.com", password }),
    })).json()).data.accessToken;

    const drJane = (await (await fetch(`${BASE_URL}/doctors`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    })).json()).data.find(d => d.email === "jane.smith@hospital.com");

    // Pharmacist Philip
    const pharmToken = (await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pharmacist@hospital.com", password }),
    })).json()).data.accessToken;

    // Labtech Lenny
    const techToken = (await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "labtech@hospital.com", password }),
    })).json()).data.accessToken;

    // Cashier Claire
    const cashierToken = (await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cashier@hospital.com", password }),
    })).json()).data.accessToken;

    // Register & Login Patient Watson
    await fetch(`${BASE_URL}/auth/register?role=PATIENT`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password, first_name: "Emma", last_name: "Watson" }),
    });

    const patToken = (await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password }),
    })).json()).data.accessToken;

    const patient = (await (await fetch(`${BASE_URL}/patients`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    })).json()).data.find(p => p.email === patientEmail);

    console.log(`✔ Staff successfully logged in. Patient profile loaded (ID: ${patient.id})`);

    // 2. Setup appointment
    const testDate = "2026-10-26"; // Monday
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

    // 3. Resolve medicine details for checkout
    const medicinesList = (await (await fetch(`${BASE_URL}/medicines?search=paracetamol`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    })).json()).data;
    const paracetamol = medicinesList[0];

    // 4. Test Unified Consultation Checkout transaction
    console.log("\n[TC1] Triggering Unified Visit Checkout (Atomic transaction)...");
    const checkoutPayload = {
      symptoms: "High fever, body ache, dry cough.",
      diagnosis: "Influenza",
      vital_signs: { blood_pressure: "118/76", heart_rate: 80, temperature: 38.5 },
      clinical_notes: "Advised bed rest for 3 days and plenty of fluids.",
      treatment_plan: "Complete medication course and return if fever persists.",
      prescription: {
        notes: "Take after meals.",
        items: [
          {
            medicine_id: paracetamol.id,
            dosage_morning: true,
            dosage_afternoon: false,
            dosage_night: true,
            instruction: "AFTER_FOOD",
            duration_days: 5,
            quantity: 10, // Should deduct from near expiry batch
          },
          {
            medicine_name_custom: "CoughRelief Syrup",
            dosage_morning: false,
            dosage_afternoon: false,
            dosage_night: true,
            duration_days: 3,
            quantity: 1,
          }
        ]
      },
      lab_tests: [
        { test_name: "Complete Blood Count", category: "Blood Test" }
      ],
      billing: {
        discount_rate: 0.10, // 10%
        tax_rate: 0.05, // 5%
      }
    };

    const checkoutRes = await fetch(`${BASE_URL}/billing/checkout/${appointmentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${docToken}`,
      },
      body: JSON.stringify(checkoutPayload),
    });
    const checkoutData = await checkoutRes.json();

    if (checkoutRes.status === 201 && checkoutData.success) {
      console.log("✔ Transaction checkout committed successfully.");
      console.log(`  EMR Created ID: ${checkoutData.data.emr_id}`);
      console.log(`  Prescription Created ID: ${checkoutData.data.prescription_id}`);
      console.log(`  Bill Created ID: ${checkoutData.data.bill_id}`);
      console.log(`  Lab Orders Created count: ${checkoutData.data.lab_test_ids.length}`);
    } else {
      throw new Error(`Checkout transaction failed: ${JSON.stringify(checkoutData)}`);
    }

    // 5. Verify Invoiced lines and net calculations
    console.log("\n[TC2] Verifying Invoice Items & Net calculations...");
    const billRes = await fetch(`${BASE_URL}/billing/${checkoutData.data.bill_id}`, {
      headers: { "Authorization": `Bearer ${cashierToken}` },
    });
    const bill = (await billRes.json()).data;
    
    console.log(`  Seeded Consultation fee: $${parseFloat(drJane.consultation_fee)}`);
    console.log(`  Total Bill Amount: $${bill.total_amount}`);
    console.log(`  Net amount (after 10% discount, 5% tax): $${bill.net_amount}`);
    
    // Assert calculations:
    // Consultation Fee = $150
    // Blood Test = $30
    // Paracetamol = $2.50 * 10 = $25
    // Custom CoughRelief = $15
    // Total = 150 + 30 + 25 + 15 = 220
    // Net = 220 * 0.90 * 1.05 = $207.90
    if (parseFloat(bill.total_amount) === 220.00 && parseFloat(bill.net_amount) === 207.90) {
      console.log("✔ Invoice math assertions match perfectly! ($220.00 total -> $207.90 net)");
    } else {
      throw new Error(`Billing calculations mismatch. Total: ${bill.total_amount}, Net: ${bill.net_amount}`);
    }

    // 6. Verify Appointment completed status
    const apptRes = await fetch(`${BASE_URL}/appointments/${appointmentId}`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    });
    const appt = (await apptRes.json()).data;
    if (appt.status === "completed") {
      console.log("✔ Linked appointment status auto-advanced to 'completed'.");
    } else {
      throw new Error(`Appointment status should be completed, got: ${appt.status}`);
    }

    // 7. Pay the Invoice
    console.log("\n[TC3] Processing Payment (Cashier Claire)...");
    const payRes = await fetch(`${BASE_URL}/billing/${bill.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cashierToken}` },
      body: JSON.stringify({ amount: 207.90, payment_method: "card" }),
    });
    const payData = await payRes.json();
    if (payRes.status === 200 && payData.data.status === "paid") {
      console.log(`✔ Payment accepted. Invoiced status progressed to: ${payData.data.status}`);
    } else {
      throw new Error(`Payment processing failed: ${JSON.stringify(payData)}`);
    }

    // 8. Submit Lab Results (Lenny) and Approve (Jane)
    console.log("\n[TC4] Advancing Lab Test order results & approvals...");
    const labTestId = checkoutData.data.lab_test_ids[0];
    
    // Technician uploads findings
    const techResultsRes = await fetch(`${BASE_URL}/laboratory/${labTestId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${techToken}` },
      body: JSON.stringify({
        results_summary: "WBC and RBC are within normal ranges. Platelets healthy.",
        findings: "Hemoglobin: 14.2 g/dL, WBC: 6.5 x10^3/uL, Platelets: 250 x10^3/uL.",
      }),
    });
    const techResults = await techResultsRes.json();
    
    // Doctor approves
    const docApproveRes = await fetch(`${BASE_URL}/laboratory/${labTestId}/approve`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    const docApprove = await docApproveRes.json();

    if (techResults.data.status === "completed" && docApprove.data.status === "approved") {
      console.log(`✔ Lab workflow completed successfully. Final status: ${docApprove.data.status}`);
    } else {
      throw new Error(`Lab workflow failed: tech=${techResults.data.status}, doc=${docApprove.data.status}`);
    }

    // 9. Dispense prescription & check FEFO stock levels
    console.log("\n[TC5] Testing FEFO Stock Deductions during Dispensing...");
    
    // Check stock BEFORE
    const stockBeforeRes = await fetch(`${BASE_URL}/pharmacy/stock/${paracetamol.id}`, {
      headers: { "Authorization": `Bearer ${pharmToken}` },
    });
    const stockBefore = (await stockBeforeRes.json()).data;
    const batchBefore = stockBefore.find(b => b.batch_number === "BAT-PARA-26B");
    console.log(`  Initial Stock quantity for batch BAT-PARA-26B (near expiry): ${batchBefore.quantity}`);

    // Dispense
    const dispenseRes = await fetch(`${BASE_URL}/pharmacy/dispense`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${pharmToken}` },
      body: JSON.stringify({ prescriptionId: checkoutData.data.prescription_id }),
    });
    const dispenseData = await dispenseRes.json();
    
    // Check stock AFTER
    const stockAfterRes = await fetch(`${BASE_URL}/pharmacy/stock/${paracetamol.id}`, {
      headers: { "Authorization": `Bearer ${pharmToken}` },
    });
    const stockAfter = (await stockAfterRes.json()).data;
    const batchAfter = stockAfter.find(b => b.batch_number === "BAT-PARA-26B");
    console.log(`  Final Stock quantity for batch BAT-PARA-26B (after 10 items Rx): ${batchAfter.quantity}`);

    if (dispenseRes.status === 201 && batchBefore.quantity - batchAfter.quantity === 10) {
      console.log("✔ FEFO inventory deduction succeeded! 10 tablets correctly subtracted from near-expiry batch.");
    } else {
      throw new Error(`FEFO deduction check failed. before=${batchBefore.quantity}, after=${batchAfter.quantity}`);
    }

    // 10. Test Transaction Integrity Rollback
    console.log("\n[TC6] Testing atomic rollback by sending invalid medicine ID in checkout...");
    
    // Book another slot
    const targetSlot2 = slots.find(s => s.status === "available" && s.id !== targetSlot.id);
    const bookRes2 = await fetch(`${BASE_URL}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${patToken}` },
      body: JSON.stringify({ doctor_id: drJane.id, slot_id: targetSlot2.id }),
    });
    const apptId2 = (await bookRes2.json()).data.id;

    // Trigger bad checkout
    const badPayload = {
      symptoms: "Symptom",
      diagnosis: "Diagnosis",
      prescription: {
        items: [{ medicine_id: "00000000-0000-0000-0000-000000000000", quantity: 1 }] // non-existent medicine UUID
      }
    };

    const badCheckoutRes = await fetch(`${BASE_URL}/billing/checkout/${apptId2}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${docToken}`,
      },
      body: JSON.stringify(badPayload),
    });
    
    // Verify that the appointment status remains "scheduled" (i.e. checkout rolled back!)
    const verifyRollbackAppt = await fetch(`${BASE_URL}/appointments/${apptId2}`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    });
    const verifyAppt = (await verifyRollbackAppt.json()).data;

    if (badCheckoutRes.status === 404 && verifyAppt.status === "scheduled") {
      console.log("✔ Rollback successful! The entire transaction aborted and appointment remains 'scheduled'.");
    } else {
      throw new Error(`Rollback test failed. checkoutStatus=${badCheckoutRes.status}, apptStatus=${verifyAppt.status}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL PHASE 4 VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉");
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
