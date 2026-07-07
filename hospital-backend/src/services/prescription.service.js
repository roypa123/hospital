const crypto = require("crypto");
const db = require("../config/knex");
const prescriptionRepository = require("../repositories/prescription.repository");
const doctorRepository = require("../repositories/doctor.repository");
const patientRepository = require("../repositories/patient.repository");
const medicineRepository = require("../repositories/medicine.repository");
const { NotFoundError, BadRequestError } = require("../shared/errors");

class PrescriptionService {
  async writePrescription(doctorUserId, data) {
    const { patient_id, medical_record_id, notes, items } = data;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestError("A prescription must contain at least one medicine item.");
    }

    // 1. Fetch doctor profile
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError("Doctor profile not found for authenticated user");
    }

    // 2. Verify patient exists
    const patient = await patientRepository.findById(patient_id);
    if (!patient) {
      throw new NotFoundError("Patient profile not found");
    }

    const createdPrescription = await db.transaction(async (trx) => {
      // 3. Generate Cryptographic Digital Signature
      const payloadString = JSON.stringify({
        patient_id,
        doctor_id: doctor.id,
        items: items.map(i => ({ name: i.medicine_name_custom || i.medicine_id, dosage: `${i.dosage_morning}-${i.dosage_afternoon}-${i.dosage_night}` })),
        timestamp: Date.now(),
      });

      const hash = crypto.createHash("sha256").update(payloadString).digest("hex");
      const digitalSignature = `Dr. ${doctor.first_name} ${doctor.last_name} (Lic: ${doctor.license_number}) | SIGN:${hash.slice(0, 16).toUpperCase()}`;

      // 4. Create prescription header
      const prescription = await prescriptionRepository.create(
        {
          patient_id,
          doctor_id: doctor.id,
          medical_record_id,
          notes,
          digital_signature: digitalSignature,
        },
        trx
      );

      // 5. Build and insert items
      const itemsToInsert = [];
      for (const item of items) {
        if (!item.medicine_id && !item.medicine_name_custom) {
          throw new BadRequestError("Provide either medicine_id or medicine_name_custom for each item.");
        }

        let medicineId = null;
        let customName = item.medicine_name_custom || null;

        if (item.medicine_id) {
          const med = await medicineRepository.findById(item.medicine_id);
          if (!med || !med.is_active) {
            throw new NotFoundError(`Medicine with ID ${item.medicine_id} not found in catalog or is inactive`);
          }
          medicineId = med.id;
          customName = med.name; // Copy catalog name as customName fallback
        }

        itemsToInsert.push({
          prescription_id: prescription.id,
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
      }

      await prescriptionRepository.createItemsBulk(itemsToInsert, trx);

      return prescription;
    });

    return await prescriptionRepository.findById(createdPrescription.id);
  }

  async getPrescriptions(filters = {}) {
    return await prescriptionRepository.findAll(filters);
  }

  async getPrescriptionById(id) {
    const prescription = await prescriptionRepository.findById(id);
    if (!prescription) {
      throw new NotFoundError("Prescription not found");
    }
    return prescription;
  }

  async getPatientPrescriptions(patientId) {
    return await prescriptionRepository.findByPatientId(patientId);
  }

  /**
   * Approves a refill request (decrements remaining refills counter, if positive)
   */
  async refillPrescription(id, itemId) {
    return await db.transaction(async (trx) => {
      const prescription = await this.getPrescriptionById(id);
      const items = await prescriptionRepository.findItemsByPrescriptionId(id);
      
      const item = items.find((i) => i.id === itemId);
      if (!item) {
        throw new NotFoundError("Prescription item not found");
      }

      if (item.refill_count <= 0) {
        throw new BadRequestError("No refills remaining for this medicine");
      }

      // Decrement refill count by 1
      await trx("prescription_items")
        .where({ id: itemId })
        .update({
          refill_count: item.refill_count - 1,
          updated_at: db.fn.now(),
        });

      return await this.getPrescriptionById(id);
    });
  }
}

module.exports = new PrescriptionService();
