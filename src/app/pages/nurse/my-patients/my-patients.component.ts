import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';

@Component({
  selector: 'app-my-patients',
  templateUrl: './my-patients.component.html',
  styleUrls: ['./my-patients.component.css']
})
export class MyPatientsComponent implements OnInit {

  appointments: any[] = [];
  isLoading = true;
  activeFilter = 'All';
  filters = ['All', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  filterLabels: Record<string, string> = {
    All: 'All', PENDING: 'Pending', CONFIRMED: 'Confirmed',
    IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled'
  };

  // Unique patients from appointments
  get assignedPatients(): any[] {
    const seen = new Set<number>();
    return this.appointments
      .filter(a => { if (seen.has(a.patientId)) return false; seen.add(a.patientId); return true; });
  }

  // Appointments for a specific patient, filtered
  appointmentsFor(patientId: number): any[] {
    return this.appointments.filter(a =>
      a.patientId === patientId &&
      (this.activeFilter === 'All' || a.status === this.activeFilter)
    );
  }

  get filteredPatients(): any[] {
    if (this.activeFilter === 'All') return this.assignedPatients;
    return this.assignedPatients.filter(p => this.appointmentsFor(p.patientId).length > 0);
  }

  constructor(private auth: AuthService, private apptService: AppointmentService) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;

    this.apptService.getByNurse(userId).subscribe({
      next: (data) => { this.appointments = data || []; this.isLoading = false; },
      error: ()     => { this.isLoading = false; }
    });
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'CONFIRMED'   ? 'badge-confirmed'
         : s === 'COMPLETED'   ? 'badge-completed'
         : s === 'CANCELLED'   ? 'badge-cancelled'
         : s === 'IN_PROGRESS' ? 'badge-inprogress'
         : 'badge-pending';
  }

  logout(): void { this.auth.logout(); }
}
