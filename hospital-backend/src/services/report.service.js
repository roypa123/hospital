const reportRepository = require("../repositories/report.repository");

class ReportService {
  async getFinancialReport(startDate, endDate) {
    const start = startDate || "1970-01-01";
    const end = endDate || new Date().toISOString().split("T")[0];
    return await reportRepository.getFinancialOverview(start, end);
  }

  async getClinicalReport(startDate, endDate) {
    const start = startDate || "1970-01-01";
    const end = endDate || new Date().toISOString().split("T")[0];
    return await reportRepository.getClinicalActivity(start, end);
  }

  async getInventoryReport() {
    return await reportRepository.getInventoryConsumption();
  }

  /**
   * Serializes headers and raw rows into a standard Comma-Separated Values string
   */
  convertToCSV(headers, rows) {
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      // Escape enclosing quotes and double-quotes if commas or quotes are inside the value
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [
      headers.join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ];

    return csvLines.join("\r\n");
  }
}

module.exports = new ReportService();
