const dashboardRepository = require("../repositories/dashboard.repository");
const doctorRepository = require("../repositories/doctor.repository");
const patientRepository = require("../repositories/patient.repository");
const { NotFoundError } = require("../shared/errors");

class DashboardService {
  async getAdminMetrics() {
    const counts = await dashboardRepository.getAdminCounts();
    const financial = await dashboardRepository.getAdminBillingRevenue();
    const appointmentsStatus = await dashboardRepository.getAdminAppointmentsByStatus();
    const revenueByMethod = await dashboardRepository.getAdminRevenueByPaymentMethod();

    return {
      overview: counts,
      financials: financial,
      appointments_by_status: appointmentsStatus,
      revenue_by_method: revenueByMethod,
    };
  }

  async getDoctorMetrics(doctorUserId) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError("Doctor profile not found for authenticated user");
    }

    const summary = await dashboardRepository.getDoctorSummary(doctor.id);
    const roster = await dashboardRepository.getDoctorUpcomingRoster(doctor.id);

    return {
      summary,
      upcoming_appointments: roster,
    };
  }

  async getPatientMetrics(patientUserId) {
    const patient = await patientRepository.findByUserId(patientUserId);
    if (!patient) {
      throw new NotFoundError("Patient profile not found for authenticated user");
    }

    const summary = await dashboardRepository.getPatientSummary(patient.id);
    const rawTimeline = await dashboardRepository.getPatientVitalsTimeline(patient.id);

    // Map vitals history trends chronologically for frontend charting
    const vitalsTimeline = rawTimeline
      .filter((rec) => rec.vital_signs)
      .map((rec) => {
        // Handle vital signs parsing (might be pre-parsed or stringified json)
        let vitals = rec.vital_signs;
        if (typeof vitals === "string") {
          try {
            vitals = JSON.parse(vitals);
          } catch (e) {
            vitals = {};
          }
        }
        return {
          medical_record_id: rec.id,
          date: rec.created_at,
          blood_pressure: vitals.blood_pressure || null,
          heart_rate: vitals.heart_rate || null,
          temperature: vitals.temperature || null,
        };
      });

    return {
      summary,
      vitals_trends: vitalsTimeline,
    };
  }
}

module.exports = new DashboardService();
