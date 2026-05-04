import { AuthService } from '../../../services/auth.service';
import { Component } from '@angular/core';

interface Course {
  id: number;
  title: string;
  provider: string;
  category: string;
  duration: string;
  credits: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress: number;
  dueDate: string;
  mandatory: boolean;
}

interface Certification {
  name: string;
  issuedBy: string;
  issuedOn: string;
  expiresOn: string;
  daysLeft: number;
}

@Component({
  selector: 'app-training',
  templateUrl: './training.component.html',
  styleUrls: ['./training.component.css']
})
export class TrainingComponent {

  constructor(private auth: AuthService) {}


  activeTab: 'courses' | 'certifications' | 'transcripts' = 'courses';
  filterCategory = 'All';

  categories = ['All', 'Critical Care', 'Emergency', 'Pediatric', 'Compliance', 'Leadership'];

  courses: Course[] = [
    { id: 1, title: 'Advanced ICU Nursing Protocols', provider: 'NurseEdu Online', category: 'Critical Care', duration: '12 hrs', credits: 12, status: 'In Progress', progress: 65, dueDate: '2026-05-30', mandatory: true },
    { id: 2, title: 'BLS Recertification', provider: 'American Heart Association', category: 'Emergency', duration: '4 hrs', credits: 4, status: 'Not Started', progress: 0, dueDate: '2026-06-01', mandatory: true },
    { id: 3, title: 'Pediatric Emergency Care', provider: 'NurseEdu Online', category: 'Pediatric', duration: '8 hrs', credits: 8, status: 'Completed', progress: 100, dueDate: '2026-04-10', mandatory: false },
    { id: 4, title: 'HIPAA Compliance & Privacy', provider: 'CareConnect Learning', category: 'Compliance', duration: '2 hrs', credits: 2, status: 'Completed', progress: 100, dueDate: '2026-03-31', mandatory: true },
    { id: 5, title: 'Nurse Leadership & Team Management', provider: 'NurseEdu Online', category: 'Leadership', duration: '6 hrs', credits: 6, status: 'Not Started', progress: 0, dueDate: '2026-07-01', mandatory: false },
    { id: 6, title: 'Infection Control & Prevention', provider: 'WHO Learning', category: 'Compliance', duration: '3 hrs', credits: 3, status: 'In Progress', progress: 40, dueDate: '2026-05-15', mandatory: true }
  ];

  certifications: Certification[] = [
    { name: 'Basic Life Support (BLS)', issuedBy: 'American Heart Association', issuedOn: '2024-06-01', expiresOn: '2026-06-01', daysLeft: 37 },
    { name: 'Advanced Cardiac Life Support (ACLS)', issuedBy: 'AHA', issuedOn: '2023-09-15', expiresOn: '2025-09-15', daysLeft: -223 },
    { name: 'Critical Care Nursing (CCRN)', issuedBy: 'AACN', issuedOn: '2022-03-20', expiresOn: '2025-03-20', daysLeft: -400 },
    { name: 'State Nursing License', issuedBy: 'Delhi Nursing Council', issuedOn: '2024-01-10', expiresOn: '2026-01-10', daysLeft: -105 }
  ];

  get filteredCourses() {
    if (this.filterCategory === 'All') return this.courses;
    return this.courses.filter(c => c.category === this.filterCategory);
  }

  get totalCredits() { return this.courses.filter(c => c.status === 'Completed').reduce((s, c) => s + c.credits, 0); }
  get completedCount() { return this.courses.filter(c => c.status === 'Completed').length; }
  get inProgressCount() { return this.courses.filter(c => c.status === 'In Progress').length; }

  statusClass(s: string) {
    if (s === 'Completed')   return 'badge-completed';
    if (s === 'In Progress') return 'badge-progress';
    return 'badge-pending';
  }

  certClass(daysLeft: number) {
    if (daysLeft < 0)  return 'cert-expired';
    if (daysLeft < 60) return 'cert-expiring';
    return 'cert-valid';
  }

  certLabel(daysLeft: number) {
    if (daysLeft < 0)  return 'Expired';
    if (daysLeft < 60) return `Expires in ${daysLeft}d`;
    return 'Valid';
  }

  enrollCourse(course: Course) {
    if (course.status === 'Not Started') {
      course.status = 'In Progress';
      course.progress = 5;
    }
  }
  logout(): void { this.auth.logout(); }
}
