// services/appointmentService.ts
import api from './api';

export interface BookSessionDto {
  specialistId: string;
  appointmentDate: string; // "yyyy-MM-dd"
  startTime: string;       // "HH:mm"
  endTime: string;
  title: string;
  description?: string;
}

export interface AppointmentDto {
  id: string;
  specialistId: string;
  specialistName: string;
  specialistProfilePictureUrl?: string;
  studentId: string;
  studentName: string;
  title: string;
  description?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  /** "Pending" | "Confirmed" | "Cancelled" | "Completed" */
  status: string;
  googleMeetLink?: string;
  canCancel: boolean;
  amountPaid?: number;
  cancellationReason?: string;
  holdExpiresAtUtc?: string;
hourlyRate?: number;
}

export interface ConfirmPayDto {
  paymentMethodId: string;
  couponCode?: string;
}

export interface ConfirmPayResult {
  appointmentId: string;
  googleMeetLink: string;
  amountCharged: number;
}

export interface BookedSlot {
  time: string;               // "HH:mm"
  status: "Reserved" | "Booked"; // Reserved = held, not yet paid; Booked = confirmed
  holdExpiresAtUtc?: string | null; // only present when status === "Reserved"
}

export const appointmentService = {
  /** Step 1 — reserve the slot. Returns { id, status: "Pending" }. */
  bookSession: async (data: BookSessionDto): Promise<{ id: string; status: string }> => {
    const res = await api.post('/Appointment', data);
    return res.data;
  },

  /**
   * Step 2 — pay and confirm.
   * Returns { appointmentId, googleMeetLink, amountCharged }.
   */
  confirmAndPay: async (
    appointmentId: string,
    data: ConfirmPayDto
  ): Promise<ConfirmPayResult> => {
    const res = await api.post(`/Appointment/${appointmentId}/confirm-pay`, data);
    return res.data;
  },

  getMyAppointments: async (): Promise<AppointmentDto[]> => {
    const res = await api.get('/Appointment/my');
    return res.data;
  },

  /**
   * Returns all taken slots on a given date, distinguishing between a slot
   * someone else has *reserved* (Pending — still on a 30-min hold, may free up)
   * and one that's fully *booked* (Confirmed — genuinely unavailable).
   */
  getBookedSlots: async (specialistId: string, date: string): Promise<BookedSlot[]> => {
    const res = await api.get('/Appointment/booked-slots', {
      params: { specialistId, date },
    });
    return res.data;
  },

  cancelAppointment: async (id: string, reason?: string): Promise<void> => {
    await api.put(`/Appointment/${id}/cancel`, { reason });
  },

  confirmAppointment: async (id: string): Promise<void> => {
    await api.put(`/Appointment/${id}/confirm`);
  },

  completeAppointment: async (id: string): Promise<void> => {
    await api.put(`/Appointment/${id}/complete`);
  },

getMySessionsAsSpecialist: async (): Promise<AppointmentDto[]> => {
  const res = await api.get('/Appointment/my-sessions');
  return res.data;
},

getById: async (id: string): Promise<AppointmentDto> => {
  const res = await api.get(`/Appointment/${id}`);
  return res.data;
},
};