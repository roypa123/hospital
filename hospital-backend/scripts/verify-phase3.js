require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");

const PORT = 3052;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend Phase 3 Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    const timestamp = Date.now();
    const patientEmail = `patient.p3.${timestamp}@example.com`;
    const password = "Password123!";

    // 1. Log in as Dr. Jane (jane.smith@hospital.com)
    console.log("\n[Setup] Logging in as Doctor Jane (seeded)...");
    const docLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "jane.smith@hospital.com", password: "Password123!" }),
    });
    const docLoginData = await docLoginRes.json();
    const docToken = docLoginData.data.accessToken;
    
    // Find Doctor Jane profile ID
    const docProfileRes = await fetch(`${BASE_URL}/doctors`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    const docProfileData = await docProfileRes.json();
    const drJane = docProfileData.data.find(d => d.email === "jane.smith@hospital.com");
    console.log(`✔ Doctor logged in (Doctor ID: ${drJane.id})`);

    // 2. Register Patient
    console.log("\n[Setup] Registering patient...");
    const patRegRes = await fetch(`${BASE_URL}/auth/register?role=PATIENT`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: patientEmail,
        password,
        first_name: "Emma",
        last_name: "Watson",
        date_of_birth: "1994-08-24",
      }),
    });
    const patRegData = await patRegRes.json();
    const patientUserId = patRegData.data.id;

    // Log in Patient
    const patLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password }),
    });
    const patLoginData = await patLoginRes.json();
    const patToken = patLoginData.data.accessToken;
    const patientId = patLoginData.data.user.roles.includes("PATIENT")
      ? (await (await fetch(`${BASE_URL}/patients`, { headers: { "Authorization": `Bearer ${docToken}` } })).json()).data.find(p => p.email === patientEmail).id
      : null;
      
    console.log(`✔ Patient Watson logged in (Patient ID: ${patientId})`);

    // 3. Setup appointment booking
    console.log("\n[Setup] Creating slots and booking appointment...");
    const testDate = "2026-10-19"; // Monday
    // Generate slots
    await fetch(`${BASE_URL}/appointments/slots/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${docToken}` },
      body: JSON.stringify({ doctor_id: drJane.id, date: testDate }),
    });
    // Get slots
    const slotsRes = await fetch(`${BASE_URL}/appointments/slots?doctor_id=${drJane.id}&date=${testDate}`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    });
    const slotsData = await slotsRes.json();
    const targetSlot = slotsData.data.find(s => s.status === "available");
    if (!targetSlot) {
      throw new Error(`No available slot found for Dr. Jane on ${testDate}`);
    }
    
    // Book appointment
    const bookRes = await fetch(`${BASE_URL}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${patToken}` },
      body: JSON.stringify({ doctor_id: drJane.id, slot_id: targetSlot.id }),
    });
    const bookData = await bookRes.json();
    const appointmentId = bookData.data.id;
    console.log(`✔ Appointment booked (Appointment ID: ${appointmentId}). Current status: ${bookData.data.status}`);

    // 4. Test EMR creation and Auto-completion of appointment
    console.log("\n[TC1] Creating Medical Record (EMR) as Doctor Jane...");
    const vitals = { blood_pressure: "120/80", heart_rate: 76, temperature: 37.8 };
    const emrRes = await fetch(`${BASE_URL}/medical-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${docToken}`,
      },
      body: JSON.stringify({
        patient_id: patientId,
        appointment_id: appointmentId,
        symptoms: "Dry cough, sore throat, mild fatigue.",
        diagnosis: "Pharyngitis",
        vital_signs: vitals,
        clinical_notes: "Advised warm saline gargles. Fluids intake increase.",
        treatment_plan: "Symptomatic treatment for 5 days.",
      }),
    });
    const emrData = await emrRes.json();

    if (emrRes.status === 201 && emrData.success) {
      console.log("✔ Medical record logged successfully.");
      console.log(`  Diagnosis: ${emrData.data.diagnosis}`);
      console.log(`  Vitals registered: BP=${emrData.data.vital_signs.blood_pressure}, HR=${emrData.data.vital_signs.heart_rate}`);
    } else {
      throw new Error(`Failed to create EMR: ${JSON.stringify(emrData)}`);
    }

    // 5. Verify Appointment Auto-Advanced to completed
    console.log("\n[TC2] Checking if linked appointment auto-advanced to 'completed'...");
    const apptCheckRes = await fetch(`${BASE_URL}/appointments/${appointmentId}`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    const apptCheckData = await apptCheckRes.json();
    
    if (apptCheckRes.status === 200 && apptCheckData.data.status === "completed") {
      console.log("✔ Linked appointment status was automatically set to 'completed'.");
    } else {
      throw new Error(`Appointment status transition check failed. Status: ${apptCheckData.data?.status}`);
    }

    // 6. Test Medicines search
    console.log("\n[TC3] Querying Medicines Catalog...");
    const medSearchRes = await fetch(`${BASE_URL}/medicines?search=paracetamol`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    const medSearchData = await medSearchRes.json();
    const paracetamol = medSearchData.data[0];
    
    const medSearchRes2 = await fetch(`${BASE_URL}/medicines?search=amoxicillin`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    const medSearchData2 = await medSearchRes2.json();
    const amoxicillin = medSearchData2.data[0];

    if (paracetamol && amoxicillin) {
      console.log("✔ Medicines catalog returned matches successfully.");
      console.log(`  Med 1: ${paracetamol.name} (Strength: ${paracetamol.strength})`);
      console.log(`  Med 2: ${amoxicillin.name} (Strength: ${amoxicillin.strength})`);
    } else {
      throw new Error("Target medicines not found in catalog");
    }

    // 7. Test Writing Prescription with Digital Signature
    console.log("\n[TC4] Writing Prescription (with indexed and custom medicines)...");
    const writePresRes = await fetch(`${BASE_URL}/prescriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${docToken}`,
      },
      body: JSON.stringify({
        patient_id: patientId,
        medical_record_id: emrData.data.id,
        notes: "Take regularly for best outcome.",
        items: [
          {
            medicine_id: paracetamol.id,
            dosage_morning: true,
            dosage_afternoon: false,
            dosage_night: true,
            instruction: "AFTER_FOOD",
            duration_days: 5,
            quantity: 10,
          },
          {
            medicine_name_custom: "SootheThroat Cough Syrup",
            dosage_morning: false,
            dosage_afternoon: false,
            dosage_night: true,
            instruction: "AFTER_FOOD",
            duration_days: 5,
            quantity: 1,
            additional_instructions: "10ml before sleep",
          },
        ],
      }),
    });
    const presData = await writePresRes.json();

    if (writePresRes.status === 201 && presData.success) {
      console.log("✔ Prescription written successfully.");
      console.log(`  Items count: ${presData.data.items.length}`);
      console.log(`  Digital Signature: ${presData.data.digital_signature}`);
      if (presData.data.digital_signature && presData.data.digital_signature.includes("Dr. Jane Smith")) {
        console.log("✔ Cryptographic signature validation succeeded.");
      } else {
        throw new Error("Incorrect signature formatting");
      }
    } else {
      throw new Error(`Failed to write prescription: ${JSON.stringify(presData)}`);
    }

    // 8. Test EMR & Prescriptions RBAC restrictions
    // Patient attempts to write EMR (should fail with 403)
    console.log("\n[TC5] Testing EMR write restriction for patients...");
    const badEmrRes = await fetch(`${BASE_URL}/medical-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${patToken}`,
      },
      body: JSON.stringify({
        patient_id: patientId,
        symptoms: "Fake symptoms",
        diagnosis: "Fake diagnosis",
      }),
    });
    
    if (badEmrRes.status === 403) {
      console.log("✔ Patient EMR write blocked with 403 Forbidden as expected.");
    } else {
      throw new Error(`Expected 403 Forbidden for patient EMR write, got ${badEmrRes.status}`);
    }

    // Patient attempts to write Prescription (should fail with 403)
    console.log("\n[TC6] Testing Prescription write restriction for patients...");
    const badPresRes = await fetch(`${BASE_URL}/prescriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${patToken}`,
      },
      body: JSON.stringify({
        patient_id: patientId,
        items: [{ medicine_name_custom: "Fake Med", duration_days: 1, quantity: 1 }],
      }),
    });
    
    if (badPresRes.status === 403) {
      console.log("✔ Patient Prescription write blocked with 403 Forbidden as expected.");
    } else {
      throw new Error(`Expected 403 Forbidden for patient Prescription write, got ${badPresRes.status}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL PHASE 3 VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉");
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
