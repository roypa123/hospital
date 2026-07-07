require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");
const crypto = require("crypto");

const PORT = 3060;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend Razorpay Integration Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    const timestamp = Date.now();
    const patientEmail = `patient.razorpay.${timestamp}@example.com`;
    const password = "Password123!";

    // 1. Log in users
    console.log("\n[Setup] Authenticating users...");
    
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

    // 2. Book slot & Checkout visit
    console.log("\n[Setup] Booking slot and conducting checkout visit...");
    const testDate = "2026-11-30"; // Monday
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

    // Checkout creating a $150.00 bill
    const checkoutRes = await fetch(`${BASE_URL}/billing/checkout/${appointmentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${docToken}` },
      body: JSON.stringify({
        symptoms: "Fatigue, mild headache.",
        diagnosis: "Dehydration",
        vital_signs: { blood_pressure: "115/75", heart_rate: 70, temperature: 36.6 },
        billing: { discount_rate: 0, tax_rate: 0 }, // $150.00 total
      }),
    });
    const checkout = (await checkoutRes.json()).data;
    const billId = checkout.bill_id;
    console.log(`✔ Checkout completed. Invoice Bill ID: ${billId}`);

    // 3. TC1: Create Razorpay Order
    console.log("\n[TC1] Requesting Razorpay payment order creation...");
    const orderRes = await fetch(`${BASE_URL}/billing/${billId}/razorpay/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${patToken}` },
    });
    
    const orderData = await orderRes.json();
    console.log(`  Razorpay Order response status: ${orderRes.status}`);
    console.log(`  Razorpay Order ID: ${orderData.data.id}`);
    console.log(`  Amount in paise: ${orderData.data.amount} (expected: 15000 paise)`);

    if (orderRes.status === 201 && orderData.data.amount === 15000) {
      console.log("✔ Razorpay order created successfully with correct currency paise conversion.");
    } else {
      throw new Error(`Order creation failed: ${JSON.stringify(orderData)}`);
    }

    const orderId = orderData.data.id;
    const paymentId = `pay_mock_${timestamp}`;

    // 4. TC2: Verify Signature validation rejects spoofed calls
    console.log("\n[TC2] Requesting payment verification with invalid signature...");
    const badVerifyRes = await fetch(`${BASE_URL}/billing/${billId}/razorpay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${patToken}` },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: "wrong_sig_value",
      }),
    });
    const badVerifyData = await badVerifyRes.json();
    console.log(`  Rejection response status: ${badVerifyRes.status}`);
    console.log(`  Rejection message: "${badVerifyData.message}"`);

    if (badVerifyRes.status === 400) {
      console.log("✔ Signature verification security block verified.");
    } else {
      throw new Error("Expected signature verification failure with 400 Bad Request");
    }

    // 5. TC3: Verify payment succeeds with a valid HMAC-SHA256 signature
    console.log("\n[TC3] Requesting payment verification with valid signature...");
    
    // Calculate valid mock signature
    const validSignature = crypto
      .createHash("sha256")
      .update(orderId + "|" + paymentId)
      .digest("hex");

    const goodVerifyRes = await fetch(`${BASE_URL}/billing/${billId}/razorpay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${patToken}` },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      }),
    });
    
    const goodVerifyData = await goodVerifyRes.json();
    console.log(`  Success response status: ${goodVerifyRes.status}`);

    if (goodVerifyRes.status === 200 && goodVerifyData.data.status === "paid") {
      console.log("✔ Payment successfully verified and recorded.");
      console.log(`  Bill invoice status set to: ${goodVerifyData.data.status}`);
      console.log(`  Bill invoice paid amount: $${goodVerifyData.data.paid_amount} / $${goodVerifyData.data.net_amount}`);
    } else {
      throw new Error(`Payment verification failed: ${JSON.stringify(goodVerifyData)}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL RAZORPAY INTEGRATION TESTS COMPLETED SUCCESSFULLY! 🎉");
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
