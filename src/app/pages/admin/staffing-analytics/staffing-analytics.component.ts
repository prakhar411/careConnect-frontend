import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { AuthService }  from '../../../services/auth.service';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

@Component({
  selector: 'app-staffing-analytics',
  templateUrl: './staffing-analytics.component.html',
  styleUrls: ['./staffing-analytics.component.css']
})
export class StaffingAnalyticsComponent implements OnInit {

  isLoading = true;
  activeTab: 'overview' | 'cost' | 'retention' | 'budget' = 'overview';

  // ── KPI cards ────────────────────────────────────────────────────────────
  totalNurses          = '0';
  activeJobs           = '0';
  pendingApplications  = '0';
  approvedApplications = '0';

  hasData = false;

  // ── Tab 1 — Overview (AC1) ───────────────────────────────────────────────
  monthlyHires: { month: string; count: number }[] = [];
  maxHires = 1;
  specializations: { name: string; count: number; pct: number }[] = [];
  topNurses: { name: string; jobs: number; specialty: string }[] = [];

  // ── Tab 2 — Cost Analysis (AC2, AC5) ────────────────────────────────────
  monthlyCosts: { month: string; spend: number }[] = [];
  maxSpend        = 1;
  avgSalaryBySpec: { spec: string; avg: number; pct: number }[] = [];
  maxAvgSalary    = 1;
  internalCount   = 0;
  externalCount   = 0;
  totalSpend      = 0;
  avgMonthlySpend = 0;

  // ── Tab 3 — Retention & Forecast (AC3, AC4, AC6) ────────────────────────
  retentionRate      = 0;
  avgTenureDays      = 0;
  projectedNextMonth = 0;
  staffingGap        = 0;
  recommendations: string[] = [];

  // ── Tab 4 — Budget Report (AC7) ──────────────────────────────────────────
  budgetRows: { month: string; spend: number; projected: boolean }[] = [];
  maxBudget = 1;

  constructor(private adminService: AdminService, private auth: AuthService) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;

    forkJoin({
      stats: this.adminService.getDashboardStats(userId),
      apps:  this.adminService.getOrgApplications(userId)
    }).subscribe({
      next: ({ stats, apps }) => {
        if (stats) {
          this.totalNurses          = String(stats.hiredNurses          ?? 0);
          this.activeJobs           = String(stats.activeJobs           ?? 0);
          this.pendingApplications  = String(stats.pendingApplications  ?? 0);
          this.approvedApplications = String(stats.approvedApplications ?? 0);
        }

        const allApps  = apps  || [];
        const approved = allApps.filter((a: any) => a.status === 'APPROVED');
        this.hasData   = allApps.length > 0;

        if (this.hasData) {
          this.buildMonthlyHires(approved);
          this.buildSpecializations(approved);
          this.buildTopNurses(approved);
          this.buildCostAnalysis(approved);
          this.buildRetentionForecast(approved, allApps);
          this.buildBudgetReport();
        }

        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ── Overview builders ────────────────────────────────────────────────────

  private buildMonthlyHires(approved: any[]): void {
    const counts: Record<string, number> = {};
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      counts[key] = 0;
      months.push(key);
    }
    approved.forEach((a: any) => {
      if (!a.appliedAt) return;
      const d = new Date(a.appliedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (counts[key] !== undefined) counts[key]++;
    });
    this.monthlyHires = months.map(key => {
      const [, m] = key.split('-').map(Number);
      return { month: MONTH_NAMES[m], count: counts[key] };
    });
    this.maxHires = Math.max(...this.monthlyHires.map(m => m.count), 1);
  }

  private buildSpecializations(approved: any[]): void {
    const counts: Record<string, number> = {};
    approved.forEach((a: any) => {
      const s = a.nurseSpecialization || 'Other';
      counts[s] = (counts[s] ?? 0) + 1;
    });
    const total = approved.length || 1;
    this.specializations = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }));
  }

  private buildTopNurses(approved: any[]): void {
    const map: Record<string, { name: string; jobs: number; specialty: string }> = {};
    approved.forEach((a: any) => {
      const name = a.nurseName || 'Unknown';
      if (!map[name]) map[name] = { name, jobs: 0, specialty: a.nurseSpecialization || '—' };
      map[name].jobs++;
    });
    this.topNurses = Object.values(map).sort((a, b) => b.jobs - a.jobs).slice(0, 5);
  }

  // ── Cost Analysis builder ────────────────────────────────────────────────

  private buildCostAnalysis(approved: any[]): void {
    const spendMap: Record<string, number> = {};
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      spendMap[key] = 0;
      months.push(key);
    }
    approved.forEach((a: any) => {
      if (!a.appliedAt) return;
      const d = new Date(a.appliedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (spendMap[key] !== undefined) spendMap[key] += (a.jobSalaryMin || 0);
    });

    this.monthlyCosts = months.map(key => {
      const [, m] = key.split('-').map(Number);
      return { month: MONTH_NAMES[m], spend: spendMap[key] };
    });
    this.maxSpend       = Math.max(...this.monthlyCosts.map(m => m.spend), 1);
    this.totalSpend     = this.monthlyCosts.reduce((s, m) => s + m.spend, 0);
    this.avgMonthlySpend = Math.round(this.totalSpend / 6);

    // Avg salary per specialization
    const specSalary: Record<string, number[]> = {};
    approved.forEach((a: any) => {
      const s = a.nurseSpecialization || 'Other';
      if (!specSalary[s]) specSalary[s] = [];
      specSalary[s].push(a.jobSalaryMin || 0);
    });
    const specs = Object.entries(specSalary)
      .map(([spec, arr]) => ({ spec, avg: Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) }))
      .sort((a, b) => b.avg - a.avg);
    this.maxAvgSalary   = Math.max(...specs.map(s => s.avg), 1);
    this.avgSalaryBySpec = specs.map(s => ({ ...s, pct: Math.round((s.avg / this.maxAvgSalary) * 100) }));

    // Internal (salaried ≥ ₹25k) vs External/Contract
    this.internalCount = approved.filter((a: any) => (a.jobSalaryMin || 0) >= 25000).length;
    this.externalCount = approved.length - this.internalCount;
  }

  // ── Retention & Forecast builder ─────────────────────────────────────────

  private buildRetentionForecast(approved: any[], allApps: any[]): void {
    const total = allApps.length;
    this.retentionRate = total > 0 ? Math.round((approved.length / total) * 100) : 0;

    const now = Date.now();
    const tenures = approved
      .filter((a: any) => a.appliedAt)
      .map((a: any) => Math.round((now - new Date(a.appliedAt).getTime()) / 86400000));
    this.avgTenureDays = tenures.length > 0
      ? Math.round(tenures.reduce((s, v) => s + v, 0) / tenures.length) : 0;

    const last3 = this.monthlyHires.slice(-3).map(m => m.count);
    const avg3  = last3.reduce((s, v) => s + v, 0) / (last3.length || 1);
    this.projectedNextMonth = Math.round(avg3 * 1.1);
    this.staffingGap        = Math.max(0, this.projectedNextMonth - approved.length);

    this.recommendations = [];
    if (this.staffingGap > 0)
      this.recommendations.push(`Hire ${this.staffingGap} more nurse(s) to meet projected demand next month.`);
    if (this.retentionRate < 60)
      this.recommendations.push('Retention rate is below 60% — review onboarding and satisfaction programs.');
    if (this.externalCount > this.internalCount)
      this.recommendations.push('Contract staff outnumber salaried staff — consider converting top performers to permanent roles.');
    const lowSpec = this.specializations.find(s => s.count === 1);
    if (lowSpec)
      this.recommendations.push(`${lowSpec.name} has only 1 nurse — hiring a backup is recommended.`);
    if (this.avgTenureDays > 180)
      this.recommendations.push('Average tenure is healthy (>6 months). Focus on retaining experienced staff.');
    if (this.recommendations.length === 0)
      this.recommendations.push('Staffing levels and costs are within healthy range. No immediate action required.');
  }

  // ── Budget Report builder ────────────────────────────────────────────────

  private buildBudgetReport(): void {
    const rows = this.monthlyCosts.map(m => ({ ...m, projected: false }));
    const spends = rows.map(r => r.spend);
    const n = spends.length;
    const avg = spends.reduce((s, v) => s + v, 0) / (n || 1);
    const trend = n > 1 ? (spends[n - 1] - spends[0]) / (n - 1) : 0;
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      rows.push({ month: MONTH_NAMES[d.getMonth()], spend: Math.max(0, Math.round(avg + trend * i)), projected: true });
    }
    this.budgetRows = rows;
    this.maxBudget  = Math.max(...rows.map(r => r.spend), 1);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  clampPx(count: number, factor = 16): number { return Math.max(8, count * factor); }
  getBarHeight(count: number):  number { return Math.round((count / this.maxHires)  * 100); }
  getCostBarHeight(v: number):  number { return Math.round((v     / this.maxSpend)  * 100); }
  getBudgetBarPct(v: number):   number { return Math.round((v     / this.maxBudget) * 100); }

  fmt(val: number): string {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000)   return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
  }

  get firstProjectedSpend(): number {
    const row = this.budgetRows[this.budgetRows.length - 3];
    return row ? row.spend : 0;
  }

  get internalPct(): number {
    const t = this.internalCount + this.externalCount;
    return t > 0 ? Math.round((this.internalCount / t) * 100) : 0;
  }
  get externalPct(): number { return 100 - this.internalPct; }

  get tenureLabel(): string {
    if (this.avgTenureDays >= 365) return `${(this.avgTenureDays / 365).toFixed(1)} yrs`;
    if (this.avgTenureDays >= 30)  return `${Math.round(this.avgTenureDays / 30)} mo`;
    return `${this.avgTenureDays} days`;
  }

  printReport(): void { window.print(); }
  logout(): void { this.auth.logout(); }
}
