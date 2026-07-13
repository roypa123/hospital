import { apiClient } from './client';

// Helper response wrappers
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

// Endpoint implementation
export const api = {
  auth: {
    register: (data: any) => apiClient.post<ApiResponse>('/auth/register', data).then(r => r.data),
    login: (data: any) => apiClient.post<ApiResponse>('/auth/login', data).then(r => r.data),
    verifyMfa: (data: any) => apiClient.post<ApiResponse>('/auth/login/mfa', data).then(r => r.data),
    logout: (data?: any) => apiClient.post<ApiResponse>('/auth/logout', data).then(r => r.data),
    forgotPassword: (data: any) => apiClient.post<ApiResponse>('/auth/forgot-password', data).then(r => r.data),
    resetPassword: (data: any) => apiClient.post<ApiResponse>('/auth/reset-password', data).then(r => r.data),
    verifyEmail: (data: any) => apiClient.post<ApiResponse>('/auth/verify-email', data).then(r => r.data),
    setup2FA: () => apiClient.post<ApiResponse>('/auth/2fa/setup').then(r => r.data),
    activate2FA: (code: string) => apiClient.post<ApiResponse>('/auth/2fa/activate', { code }).then(r => r.data),
    disable2FA: () => apiClient.post<ApiResponse>('/auth/2fa/disable').then(r => r.data),
    getSessions: () => apiClient.get<ApiResponse>('/auth/sessions').then(r => r.data),
    revokeSession: (id: string) => apiClient.delete<ApiResponse>(`/auth/sessions/${id}`).then(r => r.data),
  },
  users: {
    list: () => apiClient.get<ApiResponse>('/users').then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse>(`/users/${id}`).then(r => r.data),
    update: (id: string, data: any) => apiClient.put<ApiResponse>(`/users/${id}`, data).then(r => r.data),
    updateRole: (id: string, role: string) => apiClient.put<ApiResponse>(`/users/${id}/role`, { role }).then(r => r.data),
    updateStatus: (id: string, isActive: boolean) => apiClient.put<ApiResponse>(`/users/${id}/status`, { is_active: isActive }).then(r => r.data),
  },
  departments: {
    list: () => apiClient.get<ApiResponse>('/departments').then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse>(`/departments/${id}`).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse>('/departments', data).then(r => r.data),
    update: (id: string, data: any) => apiClient.put<ApiResponse>(`/departments/${id}`, data).then(r => r.data),
    delete: (id: string) => apiClient.delete<ApiResponse>(`/departments/${id}`).then(r => r.data),
  },
  doctors: {
    list: () => apiClient.get<ApiResponse>('/doctors').then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse>(`/doctors/${id}`).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse>('/doctors', data).then(r => r.data),
    update: (id: string, data: any) => apiClient.put<ApiResponse>(`/doctors/${id}`, data).then(r => r.data),
    getSchedules: () => apiClient.get<ApiResponse>('/doctors/schedules').then(r => r.data),
    createSchedule: (data: any) => apiClient.post<ApiResponse>('/doctors/schedules', data).then(r => r.data),
    updateSchedule: (id: string, data: any) => apiClient.put<ApiResponse>(`/doctors/schedules/${id}`, data).then(r => r.data),
  },
  patients: {
    list: (search?: string) => apiClient.get<ApiResponse>(`/patients${search ? `?search=${search}` : ''}`).then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse>(`/patients/${id}`).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse>('/patients', data).then(r => r.data),
    update: (id: string, data: any) => apiClient.put<ApiResponse>(`/patients/${id}`, data).then(r => r.data),
    delete: (id: string) => apiClient.delete<ApiResponse>(`/patients/${id}`).then(r => r.data),
  },
  appointments: {
    list: (params?: any) => apiClient.get<ApiResponse>('/appointments', { params }).then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse>(`/appointments/${id}`).then(r => r.data),
    create: (data: { doctor_id: string; slot_id: string; reason?: string; patient_id?: string }) => apiClient.post<ApiResponse>('/appointments', data).then(r => r.data),
    cancel: (id: string) => apiClient.post<ApiResponse>(`/appointments/${id}/cancel`).then(r => r.data),
    reschedule: (id: string, data: any) => apiClient.post<ApiResponse>(`/appointments/${id}/reschedule`, data).then(r => r.data),
    updateStatus: (id: string, data: { status: string; notes?: string }) => apiClient.patch<ApiResponse>(`/appointments/${id}/status`, data).then(r => r.data),
    getSlots: (doctorId: string, date: string) => apiClient.get<ApiResponse>(`/appointments/slots?doctor_id=${doctorId}&date=${date}`).then(r => r.data),
    generateSlots: (data: { doctor_id: string; date: string }) => apiClient.post<ApiResponse>('/appointments/slots/generate', data).then(r => r.data),
  },
  medicalRecords: {
    list: (params?: any) => apiClient.get<ApiResponse>('/medical-records', { params }).then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse>(`/medical-records/${id}`).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse>('/medical-records', data).then(r => r.data),
  },
  medicines: {
    list: () => apiClient.get<ApiResponse>('/medicines').then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse>(`/medicines/${id}`).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse>('/medicines', data).then(r => r.data),
    update: (id: string, data: any) => apiClient.put<ApiResponse>(`/medicines/${id}`, data).then(r => r.data),
    delete: (id: string) => apiClient.delete<ApiResponse>(`/medicines/${id}`).then(r => r.data),
  },
  prescriptions: {
    list: () => apiClient.get<ApiResponse>('/prescriptions').then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse>(`/prescriptions/${id}`).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse>('/prescriptions', data).then(r => r.data),
    dispense: (id: string) => apiClient.post<ApiResponse>(`/prescriptions/${id}/dispense`).then(r => r.data),
  },
  pharmacy: {
    listDispenses: () => apiClient.get<ApiResponse>('/pharmacy/dispenses').then(r => r.data),
    getDispense: (id: string) => apiClient.get<ApiResponse>(`/pharmacy/dispenses/${id}`).then(r => r.data),
    stockAlerts: () => apiClient.get<ApiResponse>('/pharmacy/stock-alerts').then(r => r.data),
    adjustStock: (data: any) => apiClient.post<ApiResponse>('/pharmacy/adjust-stock', data).then(r => r.data),
  },
  laboratory: {
    list: () => apiClient.get<ApiResponse>('/laboratory').then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse>(`/laboratory/${id}`).then(r => r.data),
    requestTest: (data: any) => apiClient.post<ApiResponse>('/laboratory', data).then(r => r.data),
    uploadResult: (id: string, data: any) => apiClient.post<ApiResponse>(`/laboratory/${id}/results`, data).then(r => r.data),
    approveTest: (id: string) => apiClient.post<ApiResponse>(`/laboratory/${id}/approve`).then(r => r.data),
  },
  billing: {
    listInvoices: () => apiClient.get<ApiResponse>('/billing').then(r => r.data),
    createInvoice: (data: any) => apiClient.post<ApiResponse>('/billing', data).then(r => r.data),
    getInvoice: (id: string) => apiClient.get<ApiResponse>(`/billing/${id}`).then(r => r.data),
    payInvoice: (id: string, data: any) => apiClient.post<ApiResponse>(`/billing/${id}/pay`, data).then(r => r.data),
    voidInvoice: (id: string) => apiClient.delete<ApiResponse>(`/billing/${id}`).then(r => r.data),
    createRazorpayOrder: (id: string) => apiClient.post<ApiResponse>(`/billing/${id}/razorpay/order`).then(r => r.data),
    verifyRazorpayPayment: (id: string, data: any) => apiClient.post<ApiResponse>(`/billing/${id}/razorpay/verify`, data).then(r => r.data),
  },
  insurance: {
    getProviders: () => apiClient.get<ApiResponse>('/insurance/providers').then(r => r.data),
    getPolicies: () => apiClient.get<ApiResponse>('/insurance/policies').then(r => r.data),
    listClaims: () => apiClient.get<ApiResponse>('/insurance/claims').then(r => r.data),
    getClaim: (id: string) => apiClient.get<ApiResponse>(`/insurance/claims/${id}`).then(r => r.data),
    createClaim: (data: any) => apiClient.post<ApiResponse>('/insurance/claims', data).then(r => r.data),
  },
  dashboard: {
    getAdminDashboard: () => apiClient.get<ApiResponse>('/dashboard/admin').then(r => r.data),
    getDoctorDashboard: () => apiClient.get<ApiResponse>('/dashboard/doctor').then(r => r.data),
    getPatientDashboard: () => apiClient.get<ApiResponse>('/dashboard/patient').then(r => r.data),
  },
  auditLogs: {
    list: () => apiClient.get<ApiResponse>('/audit-logs').then(r => r.data),
  },
  documents: {
    upload: (formData: FormData) => apiClient.post<ApiResponse>('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(r => r.data),
    list: (params?: any) => apiClient.get<ApiResponse>('/documents', { params }).then(r => r.data),
    download: (id: string) => apiClient.get(`/documents/${id}/download`, { responseType: 'blob' }).then(r => r.data),
    delete: (id: string) => apiClient.delete<ApiResponse>(`/documents/${id}`).then(r => r.data),
  },
  notifications: {
    list: () => apiClient.get<ApiResponse>('/notifications').then(r => r.data),
    readAll: () => apiClient.put<ApiResponse>('/notifications/read-all').then(r => r.data),
    read: (id: string) => apiClient.put<ApiResponse>(`/notifications/${id}/read`).then(r => r.data),
  },
  reports: {
    getRevenue: () => apiClient.get<ApiResponse>('/reports/revenue').then(r => r.data),
    getAppointments: () => apiClient.get<ApiResponse>('/reports/appointments').then(r => r.data),
    getOccupancy: () => apiClient.get<ApiResponse>('/reports/occupancy').then(r => r.data),
  },
};
