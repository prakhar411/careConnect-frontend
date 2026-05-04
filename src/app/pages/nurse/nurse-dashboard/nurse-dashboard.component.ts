import { AuthService } from '../../../services/auth.service';
import { Component } from '@angular/core';

@Component({
  selector: 'app-nurse-dashboard',
  templateUrl: './nurse-dashboard.component.html',
  styleUrls: ['./nurse-dashboard.component.css']
})
export class NurseDashboardComponent {

  constructor(private auth: AuthService) {}


  upcomingShifts = 3;
  monthlyEarnings = '₹42,000';
  profileCompletion = 85;

  quickActions = [
    { icon: 'bi-briefcase-fill',       label: 'Browse Jobs',    route: '/nurse-available-jobs', bgColor: '#e3f6ef', color: '#1aa37a' },
    { icon: 'bi-journal-bookmark-fill', label: 'Applications',   route: '/nurse-applications',   bgColor: '#e8f0fe', color: '#1a73e8' },
    { icon: 'bi-calendar3',            label: 'My Schedule',    route: '/nurse-schedule',        bgColor: '#fef3e2', color: '#d68910' },
    { icon: 'bi-cash-stack',           label: 'Payments',       route: '/nurse-payments',        bgColor: '#eaf6f2', color: '#0f6b51' },
    { icon: 'bi-mortarboard',          label: 'Training',       route: '/nurse-training',        bgColor: '#f3e8fd', color: '#8e44ad' },
    { icon: 'bi-person-badge',         label: 'My Profile',     route: '/nurse-profile',         bgColor: '#fde8e8', color: '#c0392b' },
  ];

  // Availability toggle
  isAvailable: boolean = true;

  toggleAvailability() {
    this.isAvailable = !this.isAvailable;
  }

  // Notifications
  notificationsOpen = false;

  notifications = [
    { message: 'New ICU job posted', time: '2 min ago', read: false },
    { message: 'Application accepted', time: '1 hr ago', read: false },
    { message: 'Shift reminder', time: '1 day ago', read: true }
  ];

  toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;
  }

  hasUnreadNotifications(): boolean {
    return this.notifications.some(n => !n.read);
  }

  // Jobs
  jobs = [
    {
      title: 'ICU Nurse',
      location: 'Delhi',
      shift: 'Night',
      salary: '₹30,000'
    },
    {
      title: 'Emergency Nurse',
      location: 'Bangalore',
      shift: 'Day',
      salary: '₹28,000'
    }
  ];

  // Applications
  applications = [
    { jobTitle: 'ICU Nurse', status: 'Applied' },
    { jobTitle: 'Emergency Nurse', status: 'Accepted' }
  ];

  // Modal
  selectedJob: any = null;

  openDetails(job: any) {
    this.selectedJob = job;
  }

  closeModal() {
    this.selectedJob = null;
  }

  apply(job: any) {
    alert('Applied for ' + job.title);
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'accepted':  return 's-accepted';
      case 'rejected':  return 's-rejected';
      case 'review':    return 's-review';
      case 'applied':   return 's-applied';
      default:          return 's-default';
    }
  }
  logout(): void { this.auth.logout(); }
}