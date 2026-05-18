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
  status: 'Upcoming' | 'Completed' | 'Cancelled';
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
        const now = new Date();

        (appointments || []).forEach((appt: any) => {
          const date  = new Date(appt.appointmentDate);
          const shift = this.buildShift(appt, date, now);
          if (date >= now && appt.status !== 'CANCELLED') {
            this.upcomingShifts.push(shift);
          } else {
            this.history.push(shift);
          }
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

  private buildShift(appt: any, date: Date, now: Date): Shift {
    const status: 'Upcoming' | 'Completed' | 'Cancelled' =
      appt.status === 'CANCELLED' ? 'Cancelled'
      : date >= now               ? 'Upcoming'
      : 'Completed';

    return {
      date:     date.toISOString().slice(0, 10),
      facility: appt.patientName ? `Patient: ${appt.patientName}` : 'CareConnect',
      shift:    this.formatTime(date),
      hours:    appt.duration ? parseInt(appt.duration, 10) || 4 : 4,
      status
    };
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
    return 'badge-cancelled';
  }

  ngOnDestroy(): void { this.notifSub?.unsubscribe(); }

  logout(): void { this.auth.logout(); }
}
