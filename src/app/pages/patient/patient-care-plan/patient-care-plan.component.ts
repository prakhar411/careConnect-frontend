import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { CareCoordinationService } from '../../../services/care-coordination.service';
import { AppointmentService } from '../../../services/appointment.service';

type PlanTab = 'team' | 'notes' | 'goals' | 'followup';

@Component({
  selector: 'app-patient-care-plan',
  templateUrl: './patient-care-plan.component.html',
  styleUrls: ['./patient-care-plan.component.css']
})
export class PatientCarePlanComponent implements OnInit {

  isLoading   = true;
  activeTab: PlanTab = 'team';

  careTeam:     any[] = [];
  providerNotes: any[] = [];
  followUpTasks: any[] = [];
  careGoals:    any[] = [];

  private patientUserId!: number;

  readonly NOTE_TYPE_LABELS: Record<string, string> = {
    CLINICAL_UPDATE: 'Clinical Update',
    REFERRAL:        'Referral',
    ALERT:           'Alert',
    FOLLOW_UP:       'Follow-Up'
  };

  readonly NOTE_TYPE_COLORS: Record<string, string> = {
    CLINICAL_UPDATE: '#0f6b51',
    REFERRAL:        '#1d4ed8',
    ALERT:           '#c0392b',
    FOLLOW_UP:       '#9C5700'
  };

  constructor(
    private auth:    AuthService,
    private careSvc: CareCoordinationService,
    private apptSvc: AppointmentService
  ) {}

  ngOnInit(): void {
    this.patientUserId = this.auth.getUserId()!;
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading = true;
    forkJoin({
      team:  this.careSvc.getTeam(this.patientUserId),
      notes: this.careSvc.getNotes(this.patientUserId),
      goals: this.careSvc.getGoals(this.patientUserId)
    }).subscribe({
      next: ({ team, notes, goals }) => {
        this.careTeam      = team  || [];
        const allNotes     = notes || [];
        this.providerNotes = allNotes.filter((n: any) => n.noteType !== 'FOLLOW_UP');
        this.followUpTasks = allNotes.filter((n: any) => n.noteType === 'FOLLOW_UP');
        this.careGoals     = goals || [];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  noteTypeLabel(type: string): string {
    return this.NOTE_TYPE_LABELS[type] || type;
  }

  noteTypeColor(type: string): string {
    return this.NOTE_TYPE_COLORS[type] || '#555';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  get achievedGoals(): number { return this.careGoals.filter(g => g.status === 'ACHIEVED').length; }
  get inProgressGoals(): number { return this.careGoals.filter(g => g.status === 'IN_PROGRESS').length; }

  goalStatusClass(status: string): string {
    return status === 'ACHIEVED'    ? 'gs-achieved'
         : status === 'IN_PROGRESS' ? 'gs-progress'
         : 'gs-pending';
  }

  goalStatusIcon(status: string): string {
    return status === 'ACHIEVED'    ? 'bi-check-circle-fill'
         : status === 'IN_PROGRESS' ? 'bi-arrow-repeat'
         : 'bi-circle';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  logout(): void { this.auth.logout(); }
}
