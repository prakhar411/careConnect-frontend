import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-credentialing',
  templateUrl: './credentialing.component.html',
  styleUrls: ['./credentialing.component.css']
})
export class CredentialingComponent implements OnInit {

  activeTab  = 'All';
  tabs       = ['All', 'VERIFIED', 'PRIVILEGED', 'PENDING', 'EXPIRED'];
  tabLabels: Record<string, string> = {
    All: 'All', VERIFIED: 'Verified', PRIVILEGED: 'Privileged', PENDING: 'Pending', EXPIRED: 'Expired'
  };
  viewMode: 'list' | 'grouped' = 'list';

  credentials: any[] = [];
  isLoading = true;

  sendingReminderId: number | null = null;
  privilegingId:     number | null = null;
  reminderSent:      Record<number, boolean> = {};

  private orgUserId!: number;

  constructor(private adminService: AdminService, private auth: AuthService) {}

  ngOnInit(): void {
    this.orgUserId = this.auth.getUserId()!;
    this.adminService.getOrgCredentials(this.orgUserId).subscribe({
      next: (data) => { this.credentials = data || []; this.isLoading = false; },
      error: ()     => { this.isLoading = false; }
    });
  }

  get filteredCredentials(): any[] {
    return this.activeTab === 'All'
      ? this.credentials
      : this.credentials.filter(c => (c.status || '').toUpperCase() === this.activeTab);
  }

  // AC 12.7 — group credentials by nurse name
  get groupedByNurse(): { name: string; credentials: any[]; verifiedCount: number; total: number }[] {
    const map = new Map<string, any[]>();
    this.filteredCredentials.forEach(c => {
      const name = c.nurseName || 'Unknown';
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(c);
    });
    return Array.from(map.entries()).map(([name, creds]) => ({
      name,
      credentials: creds,
      verifiedCount: creds.filter(c => ['VERIFIED','PRIVILEGED'].includes((c.status||'').toUpperCase())).length,
      total: creds.length
    }));
  }

  countByStatus(status: string): number {
    return this.credentials.filter(c => (c.status || '').toUpperCase() === status.toUpperCase()).length;
  }

  verify(id: number): void {
    this.adminService.verifyCredential(id).subscribe({
      next: (updated) => {
        const c = this.credentials.find(c => c.id === id);
        if (c) c.status = updated?.status ?? 'VERIFIED';
      }
    });
  }

  // AC 12.6 — grant privilege
  grantPrivilege(id: number): void {
    this.privilegingId = id;
    this.adminService.privilegeCredential(id).subscribe({
      next: (updated) => {
        const c = this.credentials.find(c => c.id === id);
        if (c) c.status = updated?.status ?? 'PRIVILEGED';
        this.privilegingId = null;
      },
      error: () => { this.privilegingId = null; }
    });
  }

  // AC 12.2 — send renewal reminder
  sendReminder(id: number): void {
    this.sendingReminderId = id;
    this.adminService.sendRenewalReminder(id).subscribe({
      next: () => {
        this.sendingReminderId = null;
        this.reminderSent[id]  = true;
        setTimeout(() => delete this.reminderSent[id], 4000);
      },
      error: () => { this.sendingReminderId = null; }
    });
  }

  // AC 12.5 — generate credentialing report
  generateReport(): void {
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const rows = this.credentials.map(c => `
      <tr>
        <td>${c.nurseName || '—'}</td>
        <td>${c.credentialType || '—'}</td>
        <td>${c.issuedBy || '—'}</td>
        <td>${c.issuedDate || '—'}</td>
        <td>${c.expiryDate || '—'}</td>
        <td style="font-weight:700;color:${
          (c.status||'').toUpperCase() === 'VERIFIED'   ? '#155724' :
          (c.status||'').toUpperCase() === 'PRIVILEGED' ? '#0d6efd' :
          (c.status||'').toUpperCase() === 'EXPIRED'    ? '#9C0006' : '#9C5700'
        }">${c.status || '—'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Credentialing Report — ${date}</title>
<style>
  body{font-family:Arial,sans-serif;margin:30px;color:#1a1a2e;}
  h1{color:#1F3864;font-size:18pt;border-bottom:3px solid #1F3864;padding-bottom:8px;}
  .meta{color:#666;font-size:10pt;margin-bottom:20px;}
  table{width:100%;border-collapse:collapse;font-size:10pt;}
  th{background:#1F3864;color:white;padding:8px 10px;text-align:left;}
  td{border:1px solid #ccc;padding:6px 10px;}
  tr:nth-child(even){background:#f5f8ff;}
  .footer{text-align:center;margin-top:20px;font-size:9pt;color:#888;border-top:1px solid #ddd;padding-top:10px;}
</style></head><body>
<h1>Credentialing Report — For Accreditation</h1>
<div class="meta">Generated: ${date} &nbsp;|&nbsp; Total Credentials: ${this.credentials.length} &nbsp;|&nbsp;
  Verified/Privileged: ${this.credentials.filter(c => ['VERIFIED','PRIVILEGED'].includes((c.status||'').toUpperCase())).length}
</div>
<table>
  <tr><th>Nurse Name</th><th>Credential Type</th><th>Issued By</th><th>Issue Date</th><th>Expiry Date</th><th>Status</th></tr>
  ${rows}
</table>
<div class="footer">CareConnect — Credentialing & Accreditation Report</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'VERIFIED'   ? 'badge-verified'
         : s === 'PRIVILEGED' ? 'badge-privileged'
         : s === 'EXPIRED'    ? 'badge-expired'
         : 'badge-pending';
  }

  needsReminder(cred: any): boolean {
    const days = this.expiryDaysLeft(cred.expiryDate);
    return days !== null && days <= 30;
  }

  expiryDaysLeft(expiryDate: string): number | null {
    if (!expiryDate) return null;
    return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  }

  expiryBadgeClass(expiryDate: string): string {
    const d = this.expiryDaysLeft(expiryDate);
    if (d === null) return '';
    return d < 0 ? 'expiry-badge-expired' : d <= 30 ? 'expiry-badge-soon' : 'expiry-badge-ok';
  }

  expiryBadgeLabel(expiryDate: string): string {
    const d = this.expiryDaysLeft(expiryDate);
    if (d === null) return '';
    return d < 0 ? 'Expired' : d <= 30 ? `Expires in ${d}d` : 'Valid';
  }

  logout(): void { this.auth.logout(); }
}
