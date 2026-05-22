import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';
import { NotificationService } from '../../../services/notification.service';
import { ShiftService } from '../../../services/shift.service';
import { NurseService } from '../../../services/nurse.service';
import { BlackoutService } from '../../../services/blackout.service';
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
  blackoutAdded   = false;
  blackoutError   = '';
  isAddingBlackout = false;
  isLoading        = true;
  unreadCount      = 0;
  private notifSub!: Subscription;
  private nurseUserId!: number;

  blackoutDates: string[] = [];

  upcomingShifts: Shift[] = [];
  history:        Shift[] = [];

  // ── Active Org Job Assignments ────────────────────────────────────────────
  activeOrgJobs: any[] = [];

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
    private auth:         AuthService,
    private apptService:  AppointmentService,
    private shiftSvc:     ShiftService,
    private nurseSvc:     NurseService,
    private blackoutSvc:  BlackoutService,
    private fb:           FormBuilder,
    private notifSvc:     NotificationService
  ) {}

  ngOnInit(): void {
    this.blackoutForm = this.fb.group({
      blackoutDate:   ['', Validators.required],
      blackoutReason: ['', Validators.maxLength(80)]
    });

    const userId = this.auth.getUserId();
    if (userId) {
      this.nurseUserId = userId;
      this.notifSvc.initSSE(userId);
      this.notifSub = this.notifSvc.unreadCount$.subscribe(c => this.unreadCount = c);
    }
    if (!userId) { this.isLoading = false; return; }

    // Load blackout dates from backend
    this.blackoutSvc.getByNurse(userId).subscribe({
      next: (dates) => { this.blackoutDates = dates || []; },
      error: () => {}
    });

    forkJoin({
      appointments: this.apptService.getByNurse(userId),
      shifts:       this.shiftSvc.getByNurse(userId),
      applications: this.nurseSvc.getApplications(userId)
    }).subscribe({
      next: ({ appointments, shifts, applications }) => {
        this.activeOrgJobs = (applications || []).filter((a: any) =>
          (a.status || '').toUpperCase() === 'APPROVED'
        );
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

  jobTypeLabel(jt: string): string {
    const map: Record<string, string> = {
      FULL_TIME: 'Full Time', PART_TIME: 'Part Time',
      CONTRACT: 'Contract', TEMPORARY: 'Temporary', PER_DIEM: 'Per Diem'
    };
    return map[jt] || jt || '—';
  }

  formatDeadline(dt: string): string {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  addBlackout() {
    if (this.blackoutForm.invalid) { this.blackoutForm.markAllAsTouched(); return; }
    const date = this.blackoutForm.value.blackoutDate;
    if (this.blackoutDates.includes(date)) { this.blackoutError = 'This date is already blocked.'; return; }
    this.isAddingBlackout = true;
    this.blackoutError    = '';
    const reason = this.blackoutForm.value.blackoutReason || undefined;
    this.blackoutSvc.add(this.nurseUserId, date, reason).subscribe({
      next: () => {
        this.blackoutDates = [...this.blackoutDates, date].sort();
        this.blackoutAdded    = true;
        this.isAddingBlackout = false;
        this.blackoutForm.reset();
        setTimeout(() => this.blackoutAdded = false, 2500);
      },
      error: () => { this.blackoutError = 'Failed to add date. Try again.'; this.isAddingBlackout = false; }
    });
  }

  removeBlackout(date: string) {
    this.blackoutSvc.remove(this.nurseUserId, date).subscribe({
      next: () => { this.blackoutDates = this.blackoutDates.filter(d => d !== date); },
      error: () => {}
    });
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
