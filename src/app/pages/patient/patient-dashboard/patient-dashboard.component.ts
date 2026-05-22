import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';
import { MedicalRecordService } from '../../../services/medical-record.service';

@Component({
  selector: 'app-patient-dashboard',
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.css']
})
export class PatientDashboardComponent implements OnInit {

  patientName = '';
  patientId: number | null = null;
  greeting = '';
  isLoading = true;

  appointments: any[] = [];
  records: any[] = [];
  notifications: string[] = [];
  cancellingId: number | null = null;

  constructor(
    private auth: AuthService,
    private apptService: AppointmentService,
    private recordService: MedicalRecordService
  ) {}

  ngOnInit(): void {
    const h = new Date().getHours();
    this.greeting = h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';

    const user = this.auth.getUser();
    // Show only first name for the greeting
    const fullName = user?.fullName || '';
    this.patientName = fullName.split(' ')[0] || user?.email || 'Patient';
    this.patientId   = this.auth.getUserId();

    if (!this.patientId) { this.isLoading = false; return; }

    forkJoin({
      appts: this.apptService.getByPatient(this.patientId),
      recs:  this.recordService.getByPatient(this.patientId)
    }).subscribe({
      next: ({ appts, recs }) => {
        this.appointments = (appts || []).map((a: any) => {
          const dt = new Date(a.appointmentDate);
          return {
            id:        a.id,
            nurseName: a.nurseName || 'Unassigned',
            date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            status:    this.mapStatus(a.status),
            rawStatus: (a.status || '').toUpperCase()
          };
        });
        this.records = (recs || []).slice(0, 5).map((r: any) => ({
          fileName: r.title || r.fileName || 'Record',
          date: r.createdAt
            ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'
        }));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private mapStatus(s: string): string {
    if (!s) return 'Scheduled';
    switch (s.toUpperCase()) {
      case 'COMPLETED':  return 'Completed';
      case 'CANCELLED':  return 'Cancelled';
      default:           return 'Scheduled';
    }
  }

  countByStatus(status: string): number {
    return this.appointments.filter(a => a.status === status).length;
  }

  cancelAppointment(appt: any): void {
    if (this.cancellingId) return;
    this.cancellingId = appt.id;
    this.apptService.cancel(appt.id).subscribe({
      next: () => {
        appt.status    = 'Cancelled';
        appt.rawStatus = 'CANCELLED';
        this.cancellingId = null;
      },
      error: () => { this.cancellingId = null; }
    });
  }

  logout(): void { this.auth.logout(); }
}
