const reportService = require("../services/report.service");
const { sendSuccess } = require("../shared/response");

class ReportController {
  async getFinancial(req, res, next) {
    try {
      const { start_date, end_date, format } = req.query;
      const data = await reportService.getFinancialReport(start_date, end_date);

      if (format === "csv") {
        const headers = [
          "Bill ID",
          "Patient Name",
          "Net Amount ($)",
          "Paid Amount ($)",
          "Status",
          "Date Created",
        ];
        const rows = data.records.map((r) => [
          r.id,
          `${r.patient_first_name} ${r.patient_last_name}`,
          r.net_amount,
          r.paid_amount,
          r.status,
          r.created_at.toISOString ? r.created_at.toISOString() : r.created_at,
        ]);

        const csv = reportService.convertToCSV(headers, rows);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="financial_report.csv"');
        return res.send(csv);
      }

      return sendSuccess(res, "Financial revenue report retrieved", data);
    } catch (error) {
      return next(error);
    }
  }

  async getClinical(req, res, next) {
    try {
      const { start_date, end_date, format } = req.query;
      const data = await reportService.getClinicalReport(start_date, end_date);

      if (format === "csv") {
        const headers = [
          "Doctor ID",
          "Doctor Name",
          "Total Consultations Booked",
          "Completed Consultation Checkups",
        ];
        const rows = data.map((r) => [
          r.doctor_id,
          `${r.doctor_first_name} ${r.doctor_last_name}`,
          r.total_appointments,
          r.completed_appointments,
        ]);

        const csv = reportService.convertToCSV(headers, rows);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="clinical_report.csv"');
        return res.send(csv);
      }

      return sendSuccess(res, "Clinical activity report retrieved", data);
    } catch (error) {
      return next(error);
    }
  }

  async getInventory(req, res, next) {
    try {
      const { format } = req.query;
      const data = await reportService.getInventoryReport();

      if (format === "csv") {
        const headers = [
          "Medicine ID",
          "Medicine Name",
          "Total Units Dispensed",
          "Remaining Stock Quantity",
        ];
        const rows = data.map((r) => [
          r.medicine_id,
          r.medicine_name,
          r.total_dispensed,
          r.remaining_stock,
        ]);

        const csv = reportService.convertToCSV(headers, rows);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="inventory_consumption_report.csv"');
        return res.send(csv);
      }

      return sendSuccess(res, "Inventory consumption report retrieved", data);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ReportController();
