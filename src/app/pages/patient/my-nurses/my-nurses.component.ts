import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';
import { MessageService } from '../../../services/message.service';
import { ShiftService } from '../../../services/shift.service';
import { PaymentService } from '../../../services/payment.service';
import { VitalSignService } from '../../../services/vital-sign.service';
import { MedicalRecordService } from '../../../services/medical-record.service';

@Component({
  selector: 'app-my-nurses',
  templateUrl: './my-nurses.component.html',
  styleUrls: ['./my-nurses.component.css']
})
export class MyNursesComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('msgEnd') msgEnd!: ElementRef;

  isLoading        = true;
  allAppointments: any[] = [];
  selectedNurse: any = null;

  // Shifts — keyed by appointmentId
  shiftsMap:   Record<number, any[]> = {};
  loadingShifts = new Set<number>();

  // Mark shift modal
  shiftModal: any  = null;   // appointment being marked
  shiftDate        = '';
  shiftNotes       = '';
  shiftDateError   = '';
  isMarkingShift   = false;
  shiftSuccess     = '';

  // Negotiation within mark-shift modal
  wantsToNegotiate = false;
  negotiatedRate   = '';
  negotiateError   = '';

  // Pay modal (for confirmed shifts)
  payModal: any          = null;
  selectedPayMethod      = 'UPI';
  isProcessingPayment    = false;
  paySuccess             = '';
  payError               = '';
  paymentRefs: string[]  = [];

  // Payment history
  payHistory: any[]          = [];
  showPayHistory             = false;
  isLoadingHistory           = false;
  refSearch                  = '';
  refSearchResult: any       = null;
  refSearchError             = '';
  isSearchingRef             = false;

  // Block message when nurse has no details
  payBlockedMsg    = '';
  payBlockedApptId: number | null = null;

  // Chat state
  chatNurse: any       = null;
  messages:  any[]     = [];
  newMessage = '';
  isSending  = false;
  chatError  = '';
  unreadFrom = new Set<number>();
  private pollTimer?: any;
  private unreadTimer?: any;
  private shouldScroll = false;

  private myUserId!: number;
  private myName!:   string;

  readonly today = new Date().toISOString().split('T')[0];

  // Reconciliation
  reconcilingId: number | null = null;
  reconcileError  = '';
  reconcileSuccess: Record<number, boolean> = {};

  // ── Care Progress ─────────────────────────────────────────────────────────
  careTab: 'vitals' | 'notes' | 'shifts' = 'vitals';
  vitals:    any[] = [];
  careNotes: any[] = [];
  isLoadingCare = false;

  constructor(
    private auth:        AuthService,
    private apptService: AppointmentService,
    private msgSvc:      MessageService,
    private shiftSvc:    ShiftService,
    private paymentSvc:  PaymentService,
    private vitalSvc:    VitalSignService,
    private medSvc:      MedicalRecordService
  ) {}

  ngOnInit(): void {
    const user      = this.auth.getUser();
    this.myUserId   = this.auth.getUserId()!;
    this.myName     = user?.fullName || user?.email || 'Patient';

    this.apptService.getByPatient(this.myUserId).subscribe({
      next: (data) => {
        this.allAppointments = data || [];
        // Load shifts for each active appointment
        this.activeAppointments.forEach(a => this.loadShiftsFor(a.id));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });

    this.refreshUnread();
    this.unreadTimer = setInterval(() => this.refreshUnread(), 10000);
  }

  ngOnDestroy(): void { this.stopPoll(); clearInterval(this.unreadTimer); }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  // ── Appointments with assigned nurse ──────────────────────────────────────

  get activeAppointments(): any[] {
    const ACTIVE = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
    return this.allAppointments.filter(a =>
      a.nurseId != null && ACTIVE.includes((a.status || '').toUpperCase())
    );
  }

  get assignedNurses(): any[] {
    const seen = new Map<number, any>();
    this.allAppointments
      .filter(a => a.nurseId != null)
      .forEach(a => {
        if (!seen.has(a.nurseId)) {
          seen.set(a.nurseId, {
            nurseId:             a.nurseId,
            nurseUserId:         a.nurseUserId,
            nurseName:           a.nurseName,
            nursePhone:          a.nursePhone,
            nurseEmail:          a.nurseEmail,
            nurseSpecialization: a.nurseSpecialization,
            nurseExperience:     a.nurseExperience,
            nurseEducation:      a.nurseEducation,
            nurseExpertise:      a.nurseExpertise,
            nurseLicenseNumber:  a.nurseLicenseNumber,
            nurseAvailability:   a.nurseAvailability,
            nurseRating:         a.nurseRating,
            nurseUpiId:          a.nurseUpiId,
            nurseBankAccount:    a.nurseBankAccount,
            nurseIfsc:           a.nurseIfsc,
            nurseBankName:       a.nurseBankName,
            nursePreferredPaymentMode: a.nursePreferredPaymentMode,
          });
        }
      });
    return Array.from(seen.values());
  }

  appointmentsFor(nurseId: number): any[] {
    return this.allAppointments
      .filter(a => a.nurseId === nurseId)
      .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
  }

  hasActiveAppointment(nurseId: number): boolean {
    const ACTIVE = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];
    return this.allAppointments.some(a =>
      a.nurseId === nurseId && ACTIVE.includes((a.status || '').toUpperCase())
    );
  }

  openDetail(nurse: any): void {
    this.selectedNurse = nurse;
    this.careTab       = 'vitals';
    this.vitals        = [];
    this.careNotes     = [];
    this.loadCareProgress();
  }
  closeDetail(): void { this.selectedNurse = null; }

  private loadCareProgress(): void {
    this.isLoadingCare = true;
    let done = 0;
    const check = () => { if (++done === 2) this.isLoadingCare = false; };

    this.vitalSvc.getByPatient(this.myUserId).subscribe({
      next: (data) => { this.vitals = (data || []).slice(0, 10); check(); },
      error: () => check()
    });
    this.medSvc.getByPatient(this.myUserId).subscribe({
      next: (data) => {
        this.careNotes = (data || [])
          .filter((r: any) => (r.recordType || '').toLowerCase() === 'care note')
          .slice(0, 10);
        check();
      },
      error: () => check()
    });
  }

  latestVital(field: string): string {
    if (!this.vitals.length) return '—';
    const v = this.vitals[0];
    return v[field] != null ? String(v[field]) : '—';
  }

  formatVitalDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Shift Loading ─────────────────────────────────────────────────────────

  loadShiftsFor(appointmentId: number): void {
    this.loadingShifts.add(appointmentId);
    this.shiftSvc.getByAppointment(appointmentId).subscribe({
      next: (shifts) => {
        this.shiftsMap[appointmentId] = shifts || [];
        this.loadingShifts.delete(appointmentId);
      },
      error: () => { this.loadingShifts.delete(appointmentId); }
    });
  }

  shiftsFor(appointmentId: number): any[] {
    return this.shiftsMap[appointmentId] || [];
  }

  confirmedShiftsFor(appointmentId: number): any[] {
    return this.shiftsFor(appointmentId).filter(s => s.status === 'CONFIRMED');
  }

  pendingShiftsFor(appointmentId: number): any[] {
    return this.shiftsFor(appointmentId).filter(s => s.status === 'PENDING_CONFIRMATION');
  }

  totalConfirmedAmount(appointmentId: number): number {
    return this.confirmedShiftsFor(appointmentId)
      .reduce((sum, s) => sum + (s.finalRate || s.originalRate || 0), 0);
  }

  // ── Mark Shift Modal ──────────────────────────────────────────────────────

  openShiftModal(appt: any): void {
    this.shiftModal       = appt;
    this.shiftDate        = this.today;
    this.shiftNotes       = '';
    this.shiftDateError   = '';
    this.shiftSuccess     = '';
    this.wantsToNegotiate = false;
    this.negotiatedRate   = '';
    this.negotiateError   = '';
  }

  closeShiftModal(): void { this.shiftModal = null; }

  // Agreed rate from nurse's bid (auto-filled)
  get agreedRate(): number { return this.shiftModal?.agreedRatePerShift ?? 0; }

  submitShift(): void {
    this.shiftDateError = '';
    this.negotiateError = '';

    if (!this.shiftDate) { this.shiftDateError = 'Please select a shift date.'; return; }
    if (this.shiftDate > this.today) {
      this.shiftDateError = 'Shift date cannot be in the future.'; return;
    }

    let negotiatedRateVal: number | undefined;
    let successMsg = '';

    if (this.agreedRate <= 0) {
      // Direct booking — no pre-agreed rate; patient MUST enter one
      const n = parseFloat(this.negotiatedRate);
      if (!this.negotiatedRate || isNaN(n) || n < 1) {
        this.negotiateError = 'Please enter a valid rate (min ₹1).'; return;
      }
      negotiatedRateVal = n;
      successMsg = `Shift marked at ₹${n}. Waiting for nurse confirmation.`;

    } else if (this.wantsToNegotiate) {
      // Bid-based — patient wants a different rate
      const n = parseFloat(this.negotiatedRate);
      if (!this.negotiatedRate || isNaN(n) || n < 1) {
        this.negotiateError = 'Please enter a valid proposed rate (min ₹1).'; return;
      }
      negotiatedRateVal = n === this.agreedRate ? undefined : n;
      successMsg = negotiatedRateVal
        ? `Negotiation sent (₹${n}). Nurse will accept or keep ₹${this.agreedRate}.`
        : `Shift marked at ₹${this.agreedRate}. Waiting for nurse confirmation.`;

    } else {
      // Bid-based — no negotiation; use agreed rate
      successMsg = `Shift marked at ₹${this.agreedRate}. Waiting for nurse confirmation.`;
    }

    this.isMarkingShift = true;
    this.shiftSvc.markShift(this.myUserId, {
      appointmentId:  this.shiftModal.id,
      shiftDate:      this.shiftDate,
      negotiatedRate: negotiatedRateVal,
      notes:          this.shiftNotes
    }).subscribe({
      next: (newShift) => {
        this.isMarkingShift  = false;
        this.shiftSuccess    = successMsg;
        if (!this.shiftsMap[this.shiftModal.id]) this.shiftsMap[this.shiftModal.id] = [];
        this.shiftsMap[this.shiftModal.id].unshift(newShift);
        setTimeout(() => this.closeShiftModal(), 2500);
      },
      error: (err: Error) => {
        this.negotiateError = err.message;
        this.isMarkingShift = false;
      }
    });
  }

  // ── Pay Modal (pay confirmed shifts) ──────────────────────────────────────

  openPayModal(appt: any): void {
    const nurse   = this.assignedNurses.find(n => n.nurseId === appt.nurseId);
    const hasUpi  = !!(nurse?.nurseUpiId);
    const hasBank = !!(nurse?.nurseBankAccount);

    // Block if nurse has no payment details at all
    if (!hasUpi && !hasBank) {
      this.payBlockedMsg    = "Nurse hasn't added payment details yet. Ask them to add UPI or bank details from their Payments page.";
      this.payBlockedApptId = appt.id;
      return;
    }

    this.payBlockedMsg    = '';
    this.payBlockedApptId = null;
    this.payModal         = { appt, nurse };
    this.paymentRefs      = [];
    this.paySuccess       = '';
    this.payError         = '';

    // Default to nurse preferred mode, falling back to what's available
    const pref = nurse?.nursePreferredPaymentMode || 'UPI';
    if (pref === 'UPI' && hasUpi)              this.selectedPayMethod = 'UPI';
    else if (pref === 'BANK_TRANSFER' && hasBank) this.selectedPayMethod = 'BANK_TRANSFER';
    else if (hasUpi)                           this.selectedPayMethod = 'UPI';
    else                                       this.selectedPayMethod = 'BANK_TRANSFER';
  }

  closePayModal(): void {
    this.payModal    = null;
    this.paymentRefs = [];
    this.paySuccess  = '';
    this.payError    = '';
  }

  confirmPayment(): void {
    if (!this.payModal) return;
    this.isProcessingPayment = true;
    this.payError            = '';

    this.paymentSvc.processPatientPayment(
      this.myUserId,
      this.payModal.appt.id,
      this.selectedPayMethod
    ).subscribe({
      next: (payments: any) => {
        this.isProcessingPayment = false;
        const list = Array.isArray(payments) ? payments : [payments];
        this.paymentRefs = list.map((p: any) => p.referenceNumber).filter(Boolean);
        this.paySuccess  = 'Payment successful!';
        // Refresh shifts + reload all appointments to update total
        this.loadShiftsFor(this.payModal.appt.id);
        this.apptService.getByPatient(this.myUserId).subscribe({
          next: (data) => { this.allAppointments = data || []; }
        });
      },
      error: (err: Error) => {
        this.payError            = err.message;
        this.isProcessingPayment = false;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatAmount(n: number): string {
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  shiftStatusClass(status: string): string {
    switch (status) {
      case 'CONFIRMED':            return 'sc-confirmed';
      case 'PENDING_CONFIRMATION': return 'sc-pending';
      case 'REJECTED':             return 'sc-rejected';
      default:                     return 'sc-pending';
    }
  }

  shiftStatusLabel(status: string): string {
    switch (status) {
      case 'CONFIRMED':            return '✓ Confirmed';
      case 'PENDING_CONFIRMATION': return '⏳ Awaiting nurse';
      case 'REJECTED':             return '✗ Rejected';
      default:                     return status;
    }
  }

  statusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    if (s === 'CONFIRMED')   return 'badge-confirmed';
    if (s === 'COMPLETED')   return 'badge-completed';
    if (s === 'CANCELLED')   return 'badge-cancelled';
    if (s === 'IN_PROGRESS') return 'badge-inprogress';
    return 'badge-pending';
  }

  minDate(appt: any): string {
    if (!appt?.appointmentDate) return '';
    return new Date(appt.appointmentDate).toISOString().split('T')[0];
  }

  // ── Chat ─────────────────────────────────────────────────────────────────

  private refreshUnread(): void {
    this.msgSvc.getUnreadSenders(this.myUserId).subscribe({
      next: (ids) => { this.unreadFrom = new Set(ids); },
      error: () => {}
    });
  }

  openChat(nurse: any): void {
    this.unreadFrom.delete(nurse.nurseUserId);
    this.chatNurse  = nurse;
    this.messages   = [];
    this.newMessage = '';
    this.chatError  = '';
    this.loadMessages();
    this.startPoll();
  }

  closeChat(): void { this.chatNurse = null; this.stopPoll(); }

  private loadMessages(): void {
    if (!this.chatNurse?.nurseUserId) return;
    this.msgSvc.getConversation(this.myUserId, this.chatNurse.nurseUserId).subscribe({
      next: (msgs) => {
        const prevLen = this.messages.length;
        this.messages = msgs;
        if (msgs.length > prevLen) this.shouldScroll = true;
        this.msgSvc.markRead(this.myUserId, this.chatNurse.nurseUserId).subscribe({
          next: () => this.unreadFrom.delete(this.chatNurse.nurseUserId)
        });
      },
      error: () => {}
    });
  }

  sendMessage(): void {
    const text = this.newMessage.trim();
    if (!text || !this.chatNurse?.nurseUserId) return;
    this.isSending = true;
    this.chatError = '';
    this.msgSvc.send(this.myUserId, this.myName, 'PATIENT', this.chatNurse.nurseUserId, 'NURSE', text).subscribe({
      next: (msg) => {
        this.messages.push(msg);
        this.newMessage   = '';
        this.isSending    = false;
        this.shouldScroll = true;
      },
      error: (err: Error) => { this.isSending = false; this.chatError = err.message; }
    });
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.sendMessage(); }
  }

  isMine(msg: any): boolean { return msg.senderId === this.myUserId; }

  private startPoll(): void { this.pollTimer = setInterval(() => this.loadMessages(), 4000); }
  private stopPoll(): void  { if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = undefined; } }
  private scrollToBottom(): void {
    try { this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }

  // ── Payment History ───────────────────────────────────────────────────────

  loadPaymentHistory(): void {
    this.isLoadingHistory = true;
    this.showPayHistory   = true;
    this.paymentSvc.getHistoryByPatient(this.myUserId).subscribe({
      next: (data) => {
        this.payHistory       = data || [];
        this.isLoadingHistory = false;
      },
      error: () => { this.isLoadingHistory = false; }
    });
  }

  searchByRef(): void {
    const ref = this.refSearch.trim().toUpperCase();
    if (!ref) return;
    this.isSearchingRef   = true;
    this.refSearchError   = '';
    this.refSearchResult  = null;
    this.paymentSvc.getByReference(ref).subscribe({
      next: (data) => {
        this.refSearchResult = data;
        this.isSearchingRef  = false;
      },
      error: (err: Error) => {
        this.refSearchError = err.message;
        this.isSearchingRef = false;
      }
    });
  }

  downloadReceipt(payment: any): void {
    const date = payment.paymentDate
      ? new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const method = payment.paymentMethod === 'UPI' ? 'UPI' : 'Bank Transfer';
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Payment Receipt — ${payment.referenceNumber}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:480px;margin:40px auto;color:#1a3b3a;}
  .header{text-align:center;border-bottom:2px solid #1aa37a;padding-bottom:16px;margin-bottom:20px;}
  .brand{font-size:22px;font-weight:800;color:#1aa37a;}
  .receipt-title{font-size:14px;color:#6a9e94;margin:4px 0;}
  .ref-box{background:#f0fdf4;border:1.5px solid #a7f3d0;border-radius:8px;padding:10px 16px;text-align:center;margin:16px 0;}
  .ref-num{font-size:18px;font-weight:700;color:#0f6b51;letter-spacing:1px;}
  .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eef4f2;font-size:13px;}
  .label{color:#6a9e94;font-weight:600;}
  .value{color:#1a3b3a;font-weight:700;text-align:right;}
  .amount-row{background:#f8fffd;border-radius:6px;padding:10px 16px;margin:12px 0;}
  .amount-label{font-size:12px;color:#6a9e94;}
  .amount-value{font-size:20px;font-weight:800;color:#0f6b51;}
  .footer{text-align:center;color:#9ab8b2;font-size:11px;margin-top:20px;border-top:1px solid #eef4f2;padding-top:12px;}
  .status-badge{background:#d4edda;color:#155724;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;}
</style></head><body>
<div class="header">
  <div class="brand">❤ CareConnect</div>
  <div class="receipt-title">Payment Receipt</div>
</div>
<div class="ref-box">
  <div style="font-size:11px;color:#6a9e94;margin-bottom:4px;">Reference Number</div>
  <div class="ref-num">${payment.referenceNumber || '—'}</div>
</div>
<div class="amount-row">
  <div class="amount-label">Amount Paid</div>
  <div class="amount-value">₹${Number(payment.amount).toLocaleString('en-IN')}</div>
</div>
<div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
<div class="row"><span class="label">Patient</span><span class="value">${payment.patientName || '—'}</span></div>
<div class="row"><span class="label">Nurse</span><span class="value">${payment.nurseName || '—'}</span></div>
<div class="row"><span class="label">Care Type</span><span class="value">${payment.appointmentCareNeeds || 'Home Care'}</span></div>
<div class="row"><span class="label">Payment Method</span><span class="value">${method}</span></div>
<div class="row"><span class="label">Status</span><span class="value"><span class="status-badge">PAID</span></span></div>
<div class="footer">CareConnect — Connecting Healthcare Professionals<br>This is a simulated payment receipt for demonstration purposes.</div>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }

  // ── Shift button guards ───────────────────────────────────────────────────

  isDateAlreadyMarked(appointmentId: number, date: string): boolean {
    return (this.shiftsMap[appointmentId] || []).some(s => s.shiftDate === date);
  }

  isEndDatePassed(appt: any): boolean {
    if (!appt.endDate) return false;
    return new Date(appt.endDate) < new Date(this.today);
  }

  isOneTimeDone(appt: any): boolean {
    return (appt.scheduleType || '').toUpperCase() === 'ONE_TIME'
      && (this.shiftsMap[appt.id] || []).length > 0;
  }

  canMarkShift(appt: any): boolean {
    if (this.isOneTimeDone(appt))          return false;
    if (this.isEndDatePassed(appt))        return false;
    if (this.isDateAlreadyMarked(appt.id, this.today)) return false;
    return true;
  }

  getUpiList(nurseUpiId: string): string[] {
    return nurseUpiId ? nurseUpiId.split(',').map(u => u.trim()).filter(Boolean) : [];
  }

  markShiftDisabledReason(appt: any): string {
    if (this.isOneTimeDone(appt))   return 'This one-time appointment already has a shift marked.';
    if (this.isEndDatePassed(appt)) return 'Appointment end date has passed.';
    if (this.isDateAlreadyMarked(appt.id, this.today)) return "Today's shift is already marked.";
    return '';
  }

  // ── Reconciliation ────────────────────────────────────────────────────────

  needsReconciliation(appt: any): boolean {
    return appt.reconciliationStatus === 'PENDING' || appt.reconciliationStatus === 'NURSE_CONFIRMED';
  }

  patientAlreadyConfirmed(appt: any): boolean {
    return appt.reconciliationStatus === 'PATIENT_CONFIRMED' || appt.reconciliationStatus === 'AGREED';
  }

  confirmReconciliation(appt: any): void {
    this.reconcilingId  = appt.id;
    this.reconcileError = '';
    this.apptService.reconcileByPatient(appt.id, this.myUserId).subscribe({
      next: (updated) => {
        // Update the appointment in our local list
        const idx = this.allAppointments.findIndex(a => a.id === appt.id);
        if (idx !== -1) this.allAppointments[idx] = { ...this.allAppointments[idx], ...updated };
        this.reconcilingId = null;
        this.reconcileSuccess[appt.id] = true;
        setTimeout(() => delete this.reconcileSuccess[appt.id], 4000);
      },
      error: (err: Error) => {
        this.reconcileError = err.message;
        this.reconcilingId  = null;
      }
    });
  }

  logout(): void { this.auth.logout(); }
}
