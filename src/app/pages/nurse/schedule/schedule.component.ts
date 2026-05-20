import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';
import { NotificationService } from '../../../services/notification.service';
import { ShiftService } from '../../../services/shift.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';

interface Shift {
  date: string;
  facility: string;
  shift: string;
  hours: number;
  status: 'Upcoming' | 'Completed' | 'Cancelled' | 'Pending';
  rateInfo?: string;
}

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css']
})
export class ScheduleComponent implements OnInit, OnDestroy {

  blackoutForm!: FormGroup;
  blackoutAdded = false;
  isAvailable   = true;
  isLoading     = true;
  unreadCount   = 0;
  private notifSub!: Subscription;

  blackoutDates: string[] = [];

  upcomingShifts: Shift[] = [];
  history:        Shift[] = [];

  // ── Earnings metrics (AC 6.4) ─────────────────────────────────────────────
  totalConfirmedEarnings = 0;
  thisMonthEarnings      = 0;
  totalConfirmedShifts   = 0;
  pendingShiftsCount     = 0;
  activeAppointments     = 0;

  get totalHoursThisMonth() {
    return this.history.filter(h => h.status === 'Completed').reduce((s, h) => s + h.hours, 0);
  }
  get completedShifts() { return this.history.filter(h => h.status === 'Completed').length; }

  constructor(
    private auth:        AuthService,
    private apptService: AppointmentService,
    private shiftSvc:    ShiftService,
    private fb:          FormBuilder,
    private notifSvc:    NotificationService
  ) {}

  ngOnInit(): void {
    this.blackoutForm = this.fb.group({ blackoutDate: ['', Validators.required] });

    const userId = this.auth.getUserId();
    if (userId) {
      this.notifSvc.initSSE(userId);
      this.notifSub = this.notifSvc.unreadCount$.subscribe(c => this.unreadCount = c);
    }
    if (!userId) { this.isLoading = false; return; }

    forkJoin({
      appointments: this.apptService.getByNurse(userId),
      shifts:       this.shiftSvc.getByNurse(userId)
    }).subscribe({
      next: ({ appointments, shifts }) => {
        const today = new Date().toISOString().split('T')[0];

        // Build appointment lookup map
        const apptMap = new Map<number, any>();
        (appointments || []).forEach((a: any) => apptMap.set(a.id, a));

        // Track which appointments already have shift entries
        const coveredApptIds = new Set<number>();

        // Build entries from actual shift records (these are the real marked shifts)
        (shifts || []).forEach((s: any) => {
          if (s.status === 'REJECTED') return;
          const appt      = apptMap.get(s.appointmentId);
          const patient   = appt?.patientName || 'Patient';
          const isPast    = (s.shiftDate || '') < today;
          const rate      = s.finalRate || s.ratePerShift || s.originalRate || 0;
          const entry: Shift = {
            date:     s.shiftDate || today,
            facility: `Patient: ${patient}`,
            shift:    s.shiftDate || '',
            hours:    4,
            status:   s.status === 'PENDING_CONFIRMATION' ? 'Pending'
                    : isPast ? 'Completed' : 'Upcoming',
            rateInfo: rate > 0 ? '₹' + Number(rate).toLocaleString('en-IN') : ''
          };
          if (isPast && s.status === 'CONFIRMED') this.history.push(entry);
          else this.upcomingShifts.push(entry);
          coveredApptIds.add(s.appointmentId);
        });

        // For appointments with NO shifts yet, show once based on appointmentDate
        (appointments || []).forEach((appt: any) => {
          if (coveredApptIds.has(appt.id) || appt.status === 'CANCELLED') return;
          const date   = new Date(appt.appointmentDate);
          const isPast = appt.appointmentDate.slice(0, 10) < today;
          const entry: Shift = {
            date:     appt.appointmentDate.slice(0, 10),
            facility: appt.patientName ? `Patient: ${appt.patientName}` : 'CareConnect',
            shift:    this.formatTime(date),
            hours:    appt.duration ? parseInt(appt.duration, 10) || 4 : 4,
            status:   isPast ? 'Completed' : 'Upcoming'
          };
          if (isPast) this.history.push(entry);
          else this.upcomingShifts.push(entry);
        });

        this.upcomingShifts.sort((a, b) => a.date.localeCompare(b.date));
        this.history.sort((a, b) => b.date.localeCompare(a.date));

        this.activeAppointments = (appointments || []).filter((a: any) =>
          ['CONFIRMED', 'IN_PROGRESS'].includes((a.status || '').toUpperCase())
        ).length;

        this.calcEarnings(shifts || []);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  private calcEarnings(shifts: any[]): void {
    const now       = new Date();
    const thisMonth = now.getMonth();
    const thisYear  = now.getFullYear();

    const confirmed = shifts.filter((s: any) => s.status === 'CONFIRMED');
    this.totalConfirmedShifts   = confirmed.length;
    this.pendingShiftsCount     = shifts.filter((s: any) => s.status === 'PENDING_CONFIRMATION').length;
    this.totalConfirmedEarnings = confirmed.reduce((sum: number, s: any) =>
      sum + (s.finalRate || s.originalRate || 0), 0);

    this.thisMonthEarnings = confirmed
      .filter((s: any) => {
        if (!s.shiftDate) return false;
        const d = new Date(s.shiftDate);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum: number, s: any) => sum + (s.finalRate || s.originalRate || 0), 0);
  }

  formatAmount(n: number): string {
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  toggleAvailability() { this.isAvailable = !this.isAvailable; }

  addBlackout() {
    if (this.blackoutForm.invalid) { this.blackoutForm.markAllAsTouched(); return; }
    const d = this.blackoutForm.value.blackoutDate;
    if (!this.blackoutDates.includes(d)) {
      this.blackoutDates.push(d);
      this.blackoutAdded = true;
      this.blackoutForm.reset();
      setTimeout(() => this.blackoutAdded = false, 2500);
    }
  }

  removeBlackout(date: string) {
    this.blackoutDates = this.blackoutDates.filter(d => d !== date);
  }

  monthDay(date: string) { return date.slice(5); }

  statusClass(s: string) {
    if (s === 'Upcoming')  return 'badge-upcoming';
    if (s === 'Completed') return 'badge-completed';
    if (s === 'Pending')   return 'badge-pending-confirm';
    return 'badge-cancelled';
  }

  ngOnDestroy(): void { this.notifSub?.unsubscribe(); }

  logout(): void { this.auth.logout(); }
}
