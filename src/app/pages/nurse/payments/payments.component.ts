import { AuthService } from '../../../services/auth.service';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.css']
})
export class PaymentsComponent implements OnInit {

  timesheetForm!: FormGroup;
  submitSuccess = false;
  activeTab: 'timesheet' | 'history' = 'history';

  paymentHistory = [
    { period: 'Apr 1–15, 2026', facility: 'Apollo Hospital', hours: 72, rate: '₹687/hr', gross: '₹49,464', deductions: '₹4,946', net: '₹44,518', status: 'Paid', paidOn: '2026-04-18' },
    { period: 'Mar 16–31, 2026', facility: 'Apollo Hospital', hours: 80, rate: '₹687/hr', gross: '₹54,960', deductions: '₹5,496', net: '₹49,464', status: 'Paid', paidOn: '2026-04-03' },
    { period: 'Mar 1–15, 2026', facility: 'Fortis Healthcare', hours: 64, rate: '₹625/hr', gross: '₹40,000', deductions: '₹4,000', net: '₹36,000', status: 'Paid', paidOn: '2026-03-18' },
    { period: 'Feb 16–28, 2026', facility: 'Apollo Hospital', hours: 70, rate: '₹687/hr', gross: '₹48,090', deductions: '₹4,809', net: '₹43,281', status: 'Paid', paidOn: '2026-03-04' }
  ];

  paymentMethods = ['Direct Deposit (HDFC ****4321)', 'UPI (sarah@upi)', 'Bank Transfer'];

  get totalEarningsThisMonth() { return '₹44,518'; }
  get pendingAmount()          { return '₹0'; }

  constructor(private auth: AuthService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.timesheetForm = this.fb.group({
      facility:    ['', Validators.required],
      periodStart: ['', Validators.required],
      periodEnd:   ['', Validators.required],
      hoursWorked: ['', [Validators.required, Validators.pattern('^[0-9]+$'), Validators.min(1), Validators.max(300)]],
      overtime:    ['0', [Validators.pattern('^[0-9]+$')]],
      notes:       ['']
    });
  }

  get f() { return this.timesheetForm.controls; }

  submitTimesheet() {
    if (this.timesheetForm.invalid) { this.timesheetForm.markAllAsTouched(); return; }
    this.submitSuccess = true;
    this.timesheetForm.reset();
    setTimeout(() => { this.submitSuccess = false; this.activeTab = 'history'; }, 2000);
  }
  logout(): void { this.auth.logout(); }
}
