import { AuthService } from '../../../services/auth.service';
import { Component } from '@angular/core';

interface Application {
  id: number;
  jobTitle: string;
  facility: string;
  location: string;
  appliedOn: string;
  status: 'Applied' | 'Under Review' | 'Interview Scheduled' | 'Accepted' | 'Rejected';
  salary: string;
  shift: string;}

@Component({
  selector: 'app-applications',
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.css']
})
export class ApplicationsComponent {

  constructor(private auth: AuthService) {}


  filterStatus = 'All';

  applications: Application[] = [
    { id: 1, jobTitle: 'ICU Nurse', facility: 'Apollo Hospital', location: 'Delhi', appliedOn: '2026-04-20', status: 'Interview Scheduled', salary: '₹55,000', shift: 'Night' },
    { id: 2, jobTitle: 'Emergency Nurse', facility: 'Fortis Healthcare', location: 'Bangalore', appliedOn: '2026-04-18', status: 'Under Review', salary: '₹48,000', shift: 'Day' },
    { id: 3, jobTitle: 'Home Care Nurse', facility: 'CareConnect Platform', location: 'Mumbai', appliedOn: '2026-04-15', status: 'Accepted', salary: '₹35,000', shift: 'Flexible' },
    { id: 4, jobTitle: 'Pediatric Nurse', facility: 'Rainbow Hospital', location: 'Hyderabad', appliedOn: '2026-04-10', status: 'Rejected', salary: '₹42,000', shift: 'Morning' },
    { id: 5, jobTitle: 'On-Call ICU Nurse', facility: 'AIIMS', location: 'Delhi', appliedOn: '2026-04-24', status: 'Applied', salary: '₹60,000', shift: 'Rotating' }
  ];

  statuses = ['All', 'Applied', 'Under Review', 'Interview Scheduled', 'Accepted', 'Rejected'];

  get filtered() {
    if (this.filterStatus === 'All') return this.applications;
    return this.applications.filter(a => a.status === this.filterStatus);
  }

  countByStatus(status: string) {
    return this.applications.filter(a => a.status === status).length;
  }

  statusClass(s: string) {
    const map: Record<string, string> = {
      'Applied': 'badge-applied',
      'Under Review': 'badge-review',
      'Interview Scheduled': 'badge-interview',
      'Accepted': 'badge-accepted',
      'Rejected': 'badge-rejected'
    };
    return map[s] || '';
  }
  logout(): void { this.auth.logout(); }
}
