const crypto = require("crypto");
const db = require("../config/knex");
const doctorRepository = require("../repositories/doctor.repository");
const appointmentRepository = require("../repositories/appointment.repository");
const medicalRecordRepository = require("../repositories/medicalRecord.repository");
const prescriptionRepository = require("../repositories/prescription.repository");
const medicineRepository = require("../repositories/medicine.repository");
const pharmacyRepository = require("../repositories/pharmacy.repository");
const labRepository = require("../repositories/lab.repository");
const billingService = require("./billing.service");
const { NotFoundError, BadRequestError } = require("../shared/errors");

class CheckoutService {
  /**
   * Concludes a consultation by saving EMR, creating prescriptions, ordering labs,
   * and generating the billing invoice in a single database transaction.
   */
  async checkout(appointmentId, doctorUserId, checkoutData) {
    const {
      symptoms,
      diagnosis,
      vital_signs,
      clinical_notes,
      treatment_plan,
      prescription,
      lab_tests,
      billing = {},
    } = checkoutData;

    // 1. Resolve doctor profile
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError("Doctor profile not found for authenticated user");
    }

    // 2. Fetch appointment details
    const appointment = await appointmentRepository.findAppointmentById(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Appointment not found");
    }

    if (appointment.status === "completed" || appointment.status === "cancelled") {
      throw new BadRequestError(`Cannot checkout appointment in status '${appointment.status}'`);
    }

    // Begin atomic transaction
    return await db.transaction(async (trx) => {
      // Step A: Update appointment status to completed
      await appointmentRepository.updateAppointment(appointmentId, { status: "completed" }, trx);

      // Step B: Create EMR medical record
      const emr = await medicalRecordRepository.create(
        {
          patient_id: appointment.patient_id,
          doctor_id: doctor.id,
          appointment_id: appointmentId,
          symptoms,
          diagnosis,
          vital_signs,
          clinical_notes,
          treatment_plan,
        },
        trx
      );

      const billItems = [];
      
      // Seed consultation fee into billing lines
      billItems.push({
        item_name: "Physician Consultation Fee",
        item_type: "consultation",
        reference_id: appointmentId,
        quantity: 1,
        unit_price: parseFloat(doctor.consultation_fee || 0),
      });

      // Step C: Handle Prescription
      let createdPrescription = null;
      if (prescription && prescription.items && prescription.items.length > 0) {
        // Generate digital signature
        const payloadString = JSON.stringify({
          patient_id: appointment.patient_id,
          doctor_id: doctor.id,
          items: prescription.items.map(i => ({ name: i.medicine_name_custom || i.medicine_id, dosage: `${i.dosage_morning}-${i.dosage_afternoon}-${i.dosage_night}` })),
          timestamp: Date.now(),
        });
        const hash = crypto.createHash("sha256").update(payloadString).digest("hex");
        const digitalSignature = `Dr. ${doctor.first_name} ${doctor.last_name} (Lic: ${doctor.license_number}) | SIGN:${hash.slice(0, 16).toUpperCase()}`;

        // Create prescription header
        createdPrescription = await prescriptionRepository.create(
          {
            patient_id: appointment.patient_id,
            doctor_id: doctor.id,
            medical_record_id: emr.id,
            notes: prescription.notes,
            digital_signature: digitalSignature,
          },
          trx
        );

        const itemsToInsert = [];
        for (const item of prescription.items) {
          let medicineId = null;
          let customName = item.medicine_name_custom || null;
          let unitPrice = 15.00; // Default fallback for custom medicines

          if (item.medicine_id) {
            const med = await medicineRepository.findById(item.medicine_id);
            if (!med || !med.is_active) {
              throw new NotFoundError(`Medicine with ID ${item.medicine_id} not found or inactive`);
            }
            medicineId = med.id;
            customName = med.name;

            // Fetch medicine stock selling price from inventory if available
            const stock = await pharmacyRepository.findStockByMedicineId(med.id, trx);
            if (stock && stock.length > 0) {
              unitPrice = parseFloat(stock[0].selling_price);
            }
          }

          itemsToInsert.push({
            prescription_id: createdPrescription.id,
            medicine_id: medicineId,
            medicine_name_custom: customName,
            dosage_morning: !!item.dosage_morning,
            dosage_afternoon: !!item.dosage_afternoon,
            dosage_night: !!item.dosage_night,
            instruction: item.instruction || "AFTER_FOOD",
            duration_days: parseInt(item.duration_days || 0, 10),
            quantity: parseInt(item.quantity || 0, 10),
            refill_count: parseInt(item.refill_count || 0, 10),
            additional_instructions: item.additional_instructions || null,
          });

          // Add to billing lines
          billItems.push({
            item_name: `Rx Pharmacy: ${customName}`,
            item_type: "pharmacy",
            reference_id: createdPrescription.id,
            quantity: parseInt(item.quantity || 1, 10),
            unit_price: unitPrice,
          });
        }

        await prescriptionRepository.createItemsBulk(itemsToInsert, trx);
      }

      // Step D: Handle Lab Tests Ordering
      const createdLabTests = [];
      if (lab_tests && lab_tests.length > 0) {
        for (const test of lab_tests) {
          const labOrder = await labRepository.create(
            {
              patient_id: appointment.patient_id,
              doctor_id: doctor.id,
              test_name: test.test_name,
              category: test.category,
              status: "pending",
            },
            trx
          );

          createdLabTests.push(labOrder);

          // Category-specific billing prices mapping
          let price = 50.00; // default lab test price
          const cat = test.category.toLowerCase();
          if (cat.includes("blood")) price = 30.00;
          else if (cat.includes("urine")) price = 20.00;
          else if (cat.includes("x-ray") || cat.includes("xray")) price = 75.00;
          else if (cat.includes("mri")) price = 250.00;
          else if (cat.includes("ct")) price = 150.00;
          else if (cat.includes("ecg")) price = 45.00;

          // Add to billing lines
          billItems.push({
            item_name: `Lab: ${test.test_name}`,
            item_type: "lab_test",
            reference_id: labOrder.id,
            quantity: 1,
            unit_price: price,
          });
        }
      }

      // Step E: Add Custom Charges
      if (billing.custom_charges && billing.custom_charges.length > 0) {
        billing.custom_charges.forEach((c) => {
          billItems.push({
            item_name: c.item_name,
            item_type: c.item_type || "other",
            reference_id: null,
            quantity: parseInt(c.quantity || 1, 10),
            unit_price: parseFloat(c.unit_price),
          });
        });
      }

      // Step F: Create the Billing Invoice
      const createdBill = await billingService.createBill(
        appointment.patient_id,
        appointmentId,
        billItems,
        parseFloat(billing.discount_rate || 0),
        parseFloat(billing.tax_rate || 0.05),
        trx
      );

      return {
        appointment_id: appointmentId,
        emr_id: emr.id,
        prescription_id: createdPrescription ? createdPrescription.id : null,
        lab_test_ids: createdLabTests.map((lt) => lt.id),
        bill_id: createdBill.id,
      };
    });
  }
}

module.exports = new CheckoutService();
