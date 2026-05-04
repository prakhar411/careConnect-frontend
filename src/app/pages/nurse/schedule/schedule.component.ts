import { AuthService } from '../../../services/auth.service';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Shift {
  date: string;
  facility: string;
  shift: string;
  hours: number;
  status: 'Upcoming' | 'Completed' | 'Cancelled';}

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css']
})
export class ScheduleComponent implements OnInit {

  blackoutForm!: FormGroup;
  blackoutAdded = false;
  isAvailable = true;

  blackoutDates: string[] = ['2026-05-10', '2026-05-11'];

  upcomingShifts: Shift[] = [
    { date: '2026-04-28', facility: 'Apollo Hospital', shift: 'Night (10PM–6AM)', hours: 8, status: 'Upcoming' },
    { date: '2026-04-30', facility: 'Apollo Hospital', shift: 'Night (10PM–6AM)', hours: 8, status: 'Upcoming' },
    { date: '2026-05-03', facility: 'Fortis Healthcare', shift: 'Day (8AM–4PM)', hours: 8, status: 'Upcoming' }
  ];

  history: Shift[] = [
    { date: '2026-04-20', facility: 'Apollo Hospital', shift: 'Night (10PM–6AM)', hours: 8, status: 'Completed' },
    { date: '2026-04-18', facility: 'Fortis Healthcare', shift: 'Day (8AM–4PM)', hours: 8, status: 'Completed' },
    { date: '2026-04-15', facility: 'Apollo Hospital', shift: 'Night (10PM–6AM)', hours: 8, status: 'Completed' },
    { date: '2026-04-10', facility: 'CareConnect Home', shift: 'Flexible', hours: 6, status: 'Completed' },
    { date: '2026-04-05', facility: 'Apollo Hospital', shift: 'Night (10PM–6AM)', hours: 8, status: 'Cancelled' }
  ];

  get totalHoursThisMonth() { return this.history.filter(h => h.status === 'Completed').reduce((s, h) => s + h.hours, 0); }
  get completedShifts()     { return this.history.filter(h => h.status === 'Completed').length; }

  constructor(private auth: AuthService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.blackoutForm = this.fb.group({
      blackoutDate: ['', Validators.required]
    });
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
  logout(): void { this.auth.logout(); }
}
