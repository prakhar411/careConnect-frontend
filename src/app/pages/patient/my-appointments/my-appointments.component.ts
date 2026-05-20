import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';
import { PaymentService } from '../../../services/payment.service';
import { ShiftService } from '../../../services/shift.service';

@Component({
  selector: 'app-my-appointments',
  templateUrl: './my-appointments.component.html',
  styleUrls: ['./my-appointments.component.css']
})
export class MyAppointmentsComponent implements OnInit {

  isLoading    = true;
  cancellingId: number | null = null;
  activeTab    = 'All';
  tabs         = ['All', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'Payments'];
  tabLabels: Record<string, string> = {
    All: 'All', PENDING: 'Pending', CONFIRMED: 'Confirmed', COMPLETED: 'Completed', CANCELLED: 'Cancelled', Payments: '💳 Payments'
  };

  // Payments
  pendingPayments: any[]   = [];
  isLoadingPayments        = false;
  paymentError             = '';
  payingAppointmentId: number | null = null;
  payModal: any            = null;   // the pending payment group being paid
  selectedPayMethod        = 'UPI';  // UPI or BANK_TRANSFER
  isProcessingPayment      = false;
  paySuccess               = '';
  appointments:    any[] = [];
  rawAppointments: any[] = [];
  shiftsMap: Record<number, any[]> = {};

  // Applicants panel
  applicantsTarget: any   = null;
  applicants:       any[] = [];
  loadingApplicants       = false;
  acceptingApplicationId: number | null = null;
  applicantsError         = '';

  // Nurse detail view (inside applicants panel)
  selectedApplicant: any = null;

  // Rating modal state
  ratingTarget:  any    = null;
  ratingValue    = 0;
  ratingHover    = 0;
  ratingFeedback = '';
  isRating       = false;
  ratingError    = '';
  ratingSuccess  = false;

  // Reschedule modal state
  rescheduleTarget: any = null;
  rescheduleDate   = '';
  rescheduleHour   = '09';
  rescheduleMinute = '00';
  rescheduleAmPm   = 'AM';
  isRescheduling   = false;
  rescheduleError  = '';
  today = new Date().toISOString().split('T')[0];
  hours   = ['12','01','02','03','04','05','06','07','08','09','10','11'];
  minutes = ['00','15','30','45'];

  constructor(
    private auth:       AuthService,
    private apptService: AppointmentService,
    private paymentSvc: PaymentService,
    private shiftSvc:   ShiftService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) { this.isLoading = false; return; }

    this.apptService.getByPatient(userId).subscribe({
      next: (data) => {
        this.rawAppointments = data || [];
        this.appointments    = this.rawAppointments.map((a: any) => this.mapAppointment(a));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });

    // Load all shifts for this patient, grouped by appointmentId
    this.shiftSvc.getByPatient(userId).subscribe({
      next: (shifts) => {
        const map: Record<number, any[]> = {};
        (shifts || []).forEach((s: any) => {
          if (!map[s.appointmentId]) map[s.appointmentId] = [];
          map[s.appointmentId].push(s);
        });
        this.shiftsMap = map;
      },
      error: () => {}
    });

    this.loadPendingPayments(userId);
  }

  private mapAppointment(a: any): any {
    const dt = new Date(a.appointmentDate);
    return {
      id:             a.id,
      nurseId:        a.nurseId   || null,
      nurseName:      a.nurseName || null,
      careType:       a.careNeeds || '—',
      duration:       a.duration  || '—',
      date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status:         (a.status || 'PENDING').toUpperCase(),
      applicantCount: a.applicantCount ?? 0,
      patientRating:  a.patientRating  ?? null,
      patientFeedback:a.patientFeedback ?? null
    };
  }

  get filteredAppointments(): any[] {
    if (this.activeTab === 'All') return this.appointments;
    return this.appointments.filter(a => a.status === this.activeTab);
  }

  get scheduledCount(): number {
    return this.appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length;
  }
  get completedCount(): number { return this.appointments.filter(a => a.status === 'COMPLETED').length; }
  get cancelledCount(): number { return this.appointments.filter(a => a.status === 'CANCELLED').length; }

  countByStatus(status: string): number {
    if (status === 'All') return this.appointments.length;
    return this.appointments.filter(a => a.status === status).length;
  }

  openReschedule(appt: any): void {
    this.rescheduleTarget = appt;
    this.rescheduleDate   = '';
    this.rescheduleHour   = '09';
    this.rescheduleMinute = '00';
    this.rescheduleAmPm   = 'AM';
    this.rescheduleError  = '';
  }

  closeReschedule(): void { this.rescheduleTarget = null; }

  confirmReschedule(): void {
    if (!this.rescheduleTarget || !this.rescheduleDate) {
      this.rescheduleError = 'Please select a new date.';
      return;
    }
    let h = parseInt(this.rescheduleHour, 10);
    if (this.rescheduleAmPm === 'PM' && h !== 12) h += 12;
    if (this.rescheduleAmPm === 'AM' && h === 12) h = 0;
    const time = `${h.toString().padStart(2, '0')}:${this.rescheduleMinute}`;
    const newDate = new Date(`${this.rescheduleDate}T${time}:00`).toISOString();

    this.isRescheduling = true;
    this.rescheduleError = '';
    this.apptService.reschedule(this.rescheduleTarget.id, newDate).subscribe({
      next: (updated) => {
        const appt = this.appointments.find(a => a.id === this.rescheduleTarget!.id);
        if (appt && updated) {
          const dt = new Date(updated.appointmentDate);
          appt.date = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          appt.time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
        this.isRescheduling  = false;
        this.rescheduleTarget = null;
      },
      error: (err: Error) => {
        this.rescheduleError = err.message;
        this.isRescheduling  = false;
      }
    });
  }

  cancelAppointment(id: number): void {
    this.cancellingId = id;
    this.apptService.cancel(id).subscribe({
      next: () => {
        const appt = this.appointments.find(a => a.id === id);
        if (appt) appt.status = 'CANCELLED';
        this.cancellingId = null;
      },
      error: () => { this.cancellingId = null; }
    });
  }

  getStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'CONFIRMED':   return 'badge-scheduled';
      case 'PENDING':     return 'badge-scheduled';
      case 'COMPLETED':   return 'badge-completed';
      case 'CANCELLED':   return 'badge-cancelled';
      case 'IN_PROGRESS': return 'badge-inprogress';
      default:            return 'badge-scheduled';
    }
  }

  // ── Applicants panel ─────────────────────────────────────────────
  viewApplicants(appt: any): void {
    this.applicantsTarget = appt;
    this.applicants       = [];
    this.applicantsError  = '';
    this.loadingApplicants = true;

    this.apptService.getAppointmentApplications(appt.id).subscribe({
      next: (data) => { this.applicants = data || []; this.loadingApplicants = false; },
      error: ()    => { this.applicantsError = 'Failed to load applicants.'; this.loadingApplicants = false; }
    });
  }

  closeApplicants(): void { this.applicantsTarget = null; this.applicants = []; this.selectedApplicant = null; }

  viewNurseDetail(app: any): void  { this.selectedApplicant = app; }
  closeNurseDetail(): void         { this.selectedApplicant = null; }

  // ── Compatibility score ───────────────────────────────────────────────────
  compatibilityScore(app: any): number {
    const raw = this.rawAppointments.find((a: any) => a.id === this.applicantsTarget?.id);
    let score = 0;

    // Specialization match: 40 pts
    const ns = (app.nurseSpecialization || '').toLowerCase();
    const as = (raw?.specialization || '').toLowerCase();
    if (ns && as) {
      if (ns === as) score += 40;
      else if (ns.split('/').some((p: string) => as.includes(p.trim())) ||
               as.split('/').some((p: string) => ns.includes(p.trim()))) score += 28;
      else score += 12;
    } else score += 20;

    // Skills/expertise match: 30 pts
    const exp    = (app.nurseExpertise || '').toLowerCase();
    const care   = (raw?.careNeeds || raw?.requiredSkills || '').toLowerCase();
    if (exp && care) {
      const words = care.replace(/[^a-z ]/g, '').split(/\s+/).filter((w: string) => w.length > 3);
      const hits  = words.filter((w: string) => exp.includes(w)).length;
      score += Math.min(30, 10 + hits * 8);
    } else score += 15;

    // Experience: 30 pts
    const yrs = parseInt(app.nurseExperience) || 0;
    if (yrs >= 5) score += 30;
    else if (yrs >= 3) score += 22;
    else if (yrs >= 1) score += 14;
    else score += 6;

    return Math.min(score, 100);
  }

  compatibilityLabel(score: number): string {
    if (score >= 85) return 'Excellent Match';
    if (score >= 70) return 'Good Match';
    if (score >= 50) return 'Moderate Match';
    return 'Basic Match';
  }

  compatibilityClass(score: number): string {
    if (score >= 85) return 'compat-excellent';
    if (score >= 70) return 'compat-good';
    if (score >= 50) return 'compat-moderate';
    return 'compat-basic';
  }

  selectNurse(applicationId: number): void {
    this.acceptingApplicationId = applicationId;
    this.applicantsError        = '';

    this.apptService.acceptAppointmentApplication(applicationId).subscribe({
      next: (updated) => {
        // Update the appointment card in the list
        const appt = this.appointments.find(a => a.id === this.applicantsTarget?.id);
        if (appt && updated) {
          appt.nurseName = updated.nurseName;
          appt.status    = 'CONFIRMED';
          appt.applicantCount = 0;
        }
        this.acceptingApplicationId = null;
        this.selectedApplicant = null;
        this.closeApplicants();
      },
      error: (err: Error) => {
        this.applicantsError        = err.message;
        this.acceptingApplicationId = null;
      }
    });
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  loadPendingPayments(userId: number): void {
    this.isLoadingPayments = true;
    this.paymentSvc.getPendingByPatient(userId).subscribe({
      next: (data) => {
        // Group by appointmentId
        const grouped: Record<number, any> = {};
        (data || []).forEach((p: any) => {
          const aid = p.appointmentId;
          if (!grouped[aid]) {
            grouped[aid] = {
              appointmentId:       aid,
              nurseName:           p.nurseName,
              appointmentCareNeeds:p.appointmentCareNeeds || 'Home Care',
              nurseUpiId:          p.nurseUpiId,
              nurseBankAccount:    p.nurseBankAccount,
              nurseIfsc:           p.nurseIfsc,
              nurseBankName:       p.nurseBankName,
              nursePreferredMode:  p.nursePreferredPaymentMode || 'UPI',
              shifts:              [],
              totalAmount:         0
            };
          }
          grouped[aid].shifts.push(p);
          grouped[aid].totalAmount += (p.amount || 0);
        });
        this.pendingPayments   = Object.values(grouped);
        this.isLoadingPayments = false;
      },
      error: () => { this.isLoadingPayments = false; }
    });
  }

  openPayModal(group: any): void {
    this.payModal        = group;
    this.selectedPayMethod = group.nursePreferredMode || 'UPI';
    this.paySuccess      = '';
    this.paymentError    = '';
  }

  closePayModal(): void { this.payModal = null; }

  confirmPayment(): void {
    if (!this.payModal) return;
    this.isProcessingPayment = true;
    this.paymentError        = '';
    this.paymentSvc.processPatientPayment(
      this.auth.getUserId()!,
      this.payModal.appointmentId,
      this.selectedPayMethod
    ).subscribe({
      next: () => {
        this.isProcessingPayment = false;
        this.paySuccess          = 'Payment successful! Nurse has been notified.';
        setTimeout(() => {
          this.closePayModal();
          this.loadPendingPayments(this.auth.getUserId()!);
        }, 2000);
      },
      error: (err: Error) => {
        this.paymentError        = err.message;
        this.isProcessingPayment = false;
      }
    });
  }

  // ── Shift helpers ─────────────────────────────────────────────────────────

  shiftsFor(apptId: number): any[] {
    return this.shiftsMap[apptId] || [];
  }

  latestShiftDate(apptId: number): string | null {
    const done = this.shiftsFor(apptId)
      .filter(s => s.status === 'CONFIRMED' || s.status === 'PENDING_CONFIRMATION')
      .sort((a, b) => (b.shiftDate || '').localeCompare(a.shiftDate || ''));
    return done.length > 0 ? done[0].shiftDate : null;
  }

  shiftsDoneCount(apptId: number): number {
    return this.shiftsFor(apptId).filter(s => s.status !== 'REJECTED').length;
  }

  pendingConfirmCount(apptId: number): number {
    return this.shiftsFor(apptId).filter(s => s.status === 'PENDING_CONFIRMATION').length;
  }

  formatShiftDate(d: string): string {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatAmount(n: number): string {
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  // ── Rating ────────────────────────────────────────────────────────────────

  openRating(appt: any): void {
    this.ratingTarget  = appt;
    this.ratingValue   = 0;
    this.ratingHover   = 0;
    this.ratingFeedback = '';
    this.ratingError   = '';
    this.ratingSuccess = false;
  }

  closeRating(): void { this.ratingTarget = null; }

  starArray(): number[] { return [1, 2, 3, 4, 5]; }

  submitRating(): void {
    if (this.ratingValue === 0) { this.ratingError = 'Please select a star rating.'; return; }
    const userId = this.auth.getUserId()!;
    this.isRating    = true;
    this.ratingError = '';
    this.apptService.rateAppointment(
      this.ratingTarget.id, userId, this.ratingValue, this.ratingFeedback
    ).subscribe({
      next: (updated: any) => {
        const appt = this.appointments.find(a => a.id === this.ratingTarget.id);
        if (appt) { appt.patientRating = updated.patientRating; appt.patientFeedback = updated.patientFeedback; }
        this.isRating      = false;
        this.ratingSuccess = true;
        setTimeout(() => this.closeRating(), 1500);
      },
      error: (err: Error) => { this.ratingError = err.message; this.isRating = false; }
    });
  }

  logout(): void { this.auth.logout(); }
}
