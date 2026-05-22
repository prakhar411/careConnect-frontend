import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {

  notifications: any[] = [];
  isLoading    = true;
  userId!: number;
  unreadCount  = 0;

  private notifSub!: Subscription;

  constructor(
    private auth:    AuthService,
    private notifSvc: NotificationService
  ) {}

  ngOnInit(): void {
    this.userId = this.auth.getUserId()!;
    this.notifSvc.initSSE(this.userId);
    this.loadAll();
  }

  ngOnDestroy(): void { this.notifSub?.unsubscribe(); }

  loadAll(): void {
    this.isLoading = true;
    this.notifSvc.getAll(this.userId).subscribe({
      next: (data) => {
        this.notifications = data;
        this.unreadCount   = data.filter((n: any) => !n.isRead).length;
        this.notifSvc.setUnread(this.unreadCount);
        this.isLoading     = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  markRead(n: any): void {
    if (n.isRead) return;
    this.notifSvc.markRead(n.id).subscribe(() => {
      n.isRead = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.notifSvc.decrementUnread();
    });
  }

  markAllRead(): void {
    this.notifSvc.markAllRead(this.userId).subscribe(() => {
      this.notifications.forEach((n: any) => n.isRead = true);
      this.unreadCount = 0;
      this.notifSvc.resetUnread();
    });
  }

  typeIcon(type: string): string {
    switch ((type || '').toUpperCase()) {
      case 'EMERGENCY_JOB':
      case 'EMERGENCY_REQUEST':  return 'bi-exclamation-triangle-fill text-danger';
      case 'SHIFT':
      case 'SHIFT_COVERAGE':     return 'bi-calendar-check-fill text-success';
      case 'PAYMENT':            return 'bi-cash-stack text-primary';
      case 'NEW_REQUEST':        return 'bi-person-raised-hand text-warning';
      case 'APPOINTMENT':        return 'bi-calendar-x-fill text-warning';
      case 'CREDENTIAL_REMINDER': return 'bi-shield-exclamation text-warning';
      case 'HANDOFF':            return 'bi-arrow-left-right text-info';
      default:                   return 'bi-bell-fill text-secondary';
    }
  }

  typeLabel(type: string): string {
    switch ((type || '').toUpperCase()) {
      case 'EMERGENCY_JOB':
      case 'EMERGENCY_REQUEST':  return 'Emergency';
      case 'SHIFT':
      case 'SHIFT_COVERAGE':     return 'Shift';
      case 'PAYMENT':            return 'Payment';
      case 'NEW_REQUEST':        return 'Patient Request';
      case 'APPOINTMENT':        return 'Appointment';
      case 'CREDENTIAL_REMINDER': return 'Credential';
      case 'HANDOFF':            return 'Handoff';
      default:                   return 'Notification';
    }
  }

  typeBadgeClass(type: string): string {
    switch ((type || '').toUpperCase()) {
      case 'EMERGENCY_JOB':
      case 'EMERGENCY_REQUEST':  return 'badge-emerg';
      case 'SHIFT':
      case 'SHIFT_COVERAGE':     return 'badge-shift';
      case 'PAYMENT':            return 'badge-pay';
      case 'NEW_REQUEST':        return 'badge-warn';
      case 'APPOINTMENT':        return 'badge-warn';
      case 'CREDENTIAL_REMINDER': return 'badge-warn';
      case 'HANDOFF':            return 'badge-info';
      default:                   return 'badge-general';
    }
  }

  formatDate(d: any): string {
    if (!d) return '—';
    // Handle Jackson array format [year,month,day,hour,min,sec] if write-dates-as-timestamps was on
    let dt: Date;
    if (Array.isArray(d)) {
      dt = new Date(d[0], d[1] - 1, d[2], d[3] ?? 0, d[4] ?? 0, d[5] ?? 0);
    } else {
      dt = new Date(d);
    }
    if (isNaN(dt.getTime())) return '—';
    const now  = new Date();
    const diff = Math.floor((now.getTime() - dt.getTime()) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  logout(): void { this.auth.logout(); }
}
