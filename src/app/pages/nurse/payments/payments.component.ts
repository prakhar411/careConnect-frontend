import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { PaymentService } from '../../../services/payment.service';
import { NotificationService } from '../../../services/notification.service';
import { NurseService } from '../../../services/nurse.service';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.css']
})
export class PaymentsComponent implements OnInit, OnDestroy {

  activeTab: 'bank' | 'shifts' | 'salary' | 'earnings' = 'shifts';
  isLoading    = true;
  unreadCount  = 0;
  userId!: number;

  // ── Bank details ───────────────────────────────────────────────────────────
  bankForm!: FormGroup;
  isSavingBank   = false;
  bankSuccess    = '';
  bankError      = '';
  preferredMode: 'UPI' | 'BANK_TRANSFER' = 'UPI';
  bankFieldsEnabled = false;   // enabled only after bank name selected

  // ── Shift payments (from patients) ────────────────────────────────────────
  shiftPayments: any[] = [];

  // ── Salary payments (from orgs) ───────────────────────────────────────────
  salaryPayments: any[] = [];

  // ── Earnings summary ──────────────────────────────────────────────────────
  totalEarned   = 0;
  pendingAmount = 0;

  // ── Reference search ──────────────────────────────────────────────────────
  refSearch         = '';
  refSearchResult: any = null;
  refSearchError    = '';
  isSearchingRef    = false;

  // ── Multi-UPI management ───────────────────────────────────────────────────
  upiList: string[]     = [];
  newUpiNumber          = '';
  newUpiSuffix          = '';
  showUpiSuggestions    = false;
  upiAddError           = '';
  isSavingUpi           = false;

  readonly UPI_SUFFIXES = ['ybl', 'paytm', 'okaxis', 'okhdfcbank', 'oksbi', 'slc'];

  private notifSub!: Subscription;

  // ── All Indian Banks ──────────────────────────────────────────────────────
  readonly BANK_LIST = [
    // Public Sector
    'State Bank of India (SBI)',
    'Punjab National Bank (PNB)',
    'Bank of Baroda',
    'Canara Bank',
    'Union Bank of India',
    'Bank of India',
    'Central Bank of India',
    'Indian Bank',
    'Indian Overseas Bank',
    'UCO Bank',
    'Bank of Maharashtra',
    'Punjab & Sind Bank',
    'IDBI Bank',
    // Private Sector
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'IndusInd Bank',
    'Yes Bank',
    'IDFC First Bank',
    'Federal Bank',
    'RBL Bank',
    'Bandhan Bank',
    'South Indian Bank',
    'Karnataka Bank',
    'DCB Bank',
    'City Union Bank',
    'Karur Vysya Bank',
    'Tamilnad Mercantile Bank',
    'CSB Bank',
    'Dhanlaxmi Bank',
    'Jammu & Kashmir Bank',
    'Nainital Bank',
    'DBS Bank India',
    // Small Finance Banks
    'AU Small Finance Bank',
    'Equitas Small Finance Bank',
    'Ujjivan Small Finance Bank',
    'Jana Small Finance Bank',
    'Utkarsh Small Finance Bank',
    'ESAF Small Finance Bank',
    'Suryoday Small Finance Bank',
    'Capital Small Finance Bank',
    'Fincare Small Finance Bank',
    // Payments Banks
    'Airtel Payments Bank',
    'India Post Payments Bank (IPPB)',
    'Fino Payments Bank',
    // Foreign Banks
    'Standard Chartered Bank',
    'HSBC India',
    'Deutsche Bank India',
  ].sort();

  constructor(
    private auth:       AuthService,
    private fb:         FormBuilder,
    private paymentSvc: PaymentService,
    private notifSvc:   NotificationService,
    private nurseSvc:   NurseService
  ) {}

  ngOnInit(): void {
    this.userId = this.auth.getUserId()!;
    this.buildBankForm();
    this.loadAll();
    this.loadBankDetails();
    this.notifSvc.initSSE(this.userId);
    this.notifSub = this.notifSvc.unreadCount$.subscribe(c => this.unreadCount = c);
  }

  ngOnDestroy(): void { this.notifSub?.unsubscribe(); }

  // ── Form setup ────────────────────────────────────────────────────────────

  private buildBankForm(): void {
    this.bankForm = this.fb.group({
      preferredPaymentMode: ['UPI', Validators.required],
      upiId:                [''],
      bankName:             [''],
      bankAccountNumber:    [{ value: '', disabled: true }],
      bankIfscCode:         [{ value: '', disabled: true }]
    });

    // Mode switch
    this.bankForm.get('preferredPaymentMode')!.valueChanges.subscribe(v => {
      this.preferredMode    = v;
      this.bankFieldsEnabled = false;
      this.bankForm.get('bankName')?.setValue('');
      this.bankForm.get('bankAccountNumber')?.setValue('');
      this.bankForm.get('bankIfscCode')?.setValue('');
      this.disableBankFields();
      this.applyValidators();
    });

    // Bank name → enable fields
    this.bankForm.get('bankName')!.valueChanges.subscribe(val => {
      if (this.preferredMode === 'BANK_TRANSFER') {
        if (val && val.trim()) {
          this.bankFieldsEnabled = true;
          this.enableBankFields();
        } else {
          this.bankFieldsEnabled = false;
          this.disableBankFields();
        }
      }
    });
  }

  private enableBankFields(): void {
    this.bankForm.get('bankAccountNumber')?.enable({ emitEvent: false });
    this.bankForm.get('bankIfscCode')?.enable({ emitEvent: false });
  }

  private disableBankFields(): void {
    this.bankForm.get('bankAccountNumber')?.disable({ emitEvent: false });
    this.bankForm.get('bankIfscCode')?.disable({ emitEvent: false });
  }

  private applyValidators(): void {
    const upi  = this.bankForm.get('upiId')!;
    const name = this.bankForm.get('bankName')!;
    const acc  = this.bankForm.get('bankAccountNumber')!;
    const ifsc = this.bankForm.get('bankIfscCode')!;

    if (this.preferredMode === 'UPI') {
      upi.clearValidators();  // managed by upiList separately
      name.clearValidators();
      acc.clearValidators();
      ifsc.clearValidators();
    } else {
      upi.clearValidators();
      name.setValidators([Validators.required]);
      acc.setValidators([
        Validators.required,
        Validators.pattern('^[0-9]{9,18}$')
      ]);
      ifsc.setValidators([
        Validators.required,
        Validators.pattern('^[A-Z]{4}0[A-Z0-9]{6}$')
      ]);
    }
    [upi, name, acc, ifsc].forEach(c => c.updateValueAndValidity({ emitEvent: false }));
  }

  get f() { return this.bankForm.controls; }

  // Block non-digits AND enforce max 18 / min validation on account number
  blockNonDigit(event: KeyboardEvent): boolean {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    const isDigit     = /^[0-9]$/.test(event.key);

    if (!isDigit && !allowedKeys.includes(event.key)) {
      event.preventDefault();
      return false;
    }

    // Hard block at 18 digits — prevent adding more
    if (isDigit) {
      const input = event.target as HTMLInputElement;
      const currentLen = input.value.length;
      const hasSelection = input.selectionStart !== input.selectionEnd;
      if (currentLen >= 18 && !hasSelection) {
        event.preventDefault();
        return false;
      }
    }

    return true;
  }

  // Auto-uppercase IFSC
  uppercaseIfsc(): void {
    const ctrl = this.bankForm.get('bankIfscCode')!;
    const val  = (ctrl.value || '').toUpperCase();
    ctrl.setValue(val, { emitEvent: false });
  }

  get accLen(): number { return (this.bankForm.get('bankAccountNumber')?.value || '').length; }
  get ifscLen(): number { return (this.bankForm.get('bankIfscCode')?.value || '').length; }

  // ── Save ──────────────────────────────────────────────────────────────────

  saveBankDetails(): void {
    this.applyValidators();
    if (this.preferredMode === 'UPI' && this.upiList.length === 0) {
      this.bankError = 'Please add at least one UPI ID.';
      return;
    }
    if (this.preferredMode === 'BANK_TRANSFER' && !this.bankFieldsEnabled) {
      this.bankError = 'Please select a bank first.';
      return;
    }
    // Sync upiList → form control before submitting
    if (this.preferredMode === 'UPI') {
      this.bankForm.get('upiId')?.setValue(this.upiList.join(','));
    }
    if (this.bankForm.invalid) { this.bankForm.markAllAsTouched(); return; }

    this.isSavingBank = true;
    this.bankSuccess  = '';
    this.bankError    = '';

    const raw = this.bankForm.getRawValue();
    this.paymentSvc.saveBankDetails(this.userId, raw).subscribe({
      next: () => {
        this.isSavingBank = false;
        this.bankSuccess  = 'Payment details saved successfully!';
        setTimeout(() => this.bankSuccess = '', 3000);
      },
      error: (err: Error) => { this.isSavingBank = false; this.bankError = err.message; }
    });
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private loadBankDetails(): void {
    this.nurseSvc.getProfile(this.userId).subscribe({
      next: (data: any) => {
        if (!data) return;
        const mode = data.preferredPaymentMode || 'UPI';
        this.preferredMode = mode;
        this.bankForm.patchValue({ preferredPaymentMode: mode });
        if (mode === 'UPI' && data.upiId) {
          this.bankForm.patchValue({ upiId: data.upiId });
          this.upiList = data.upiId.split(',').map((u: string) => u.trim()).filter(Boolean);
        } else if (mode === 'BANK_TRANSFER' && data.bankName) {
          this.bankFieldsEnabled = true;
          this.enableBankFields();
          this.bankForm.patchValue({
            bankName:          data.bankName,
            bankAccountNumber: data.bankAccountNumber || '',
            bankIfscCode:      data.bankIfscCode || ''
          });
        }
      },
      error: () => {}
    });
  }

  private loadAll(): void {
    this.isLoading = true;
    this.paymentSvc.getByNurse(this.userId).subscribe({
      next: (payments: any[]) => {
        this.shiftPayments  = (payments || []).filter((p: any) => p.paymentStructure === 'SHIFT');
        this.salaryPayments = (payments || []).filter((p: any) => p.paymentStructure === 'MONTHLY_SALARY');
        this.calcSummary(payments || []);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private calcSummary(payments: any[]): void {
    this.totalEarned   = payments
      .filter((p: any) => p.status === 'PROCESSED')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    this.pendingAmount = payments
      .filter((p: any) => p.status === 'PENDING')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  statusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'PROCESSED': return 'badge-paid';
      case 'PENDING':   return 'badge-pending';
      case 'FAILED':    return 'badge-failed';
      default:          return 'badge-pending';
    }
  }

  statusLabel(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'PROCESSED': return 'Paid';
      case 'PENDING':   return 'Pending';
      case 'FAILED':    return 'Failed';
      default:          return status;
    }
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Multi-UPI helpers ─────────────────────────────────────────────────────

  get filteredSuffixes(): string[] {
    const typed = this.newUpiSuffix.toLowerCase().trim();
    if (!typed) return this.UPI_SUFFIXES;
    return this.UPI_SUFFIXES.filter(s => s.startsWith(typed));
  }

  onUpiNumberInput(): void {
    this.newUpiNumber = this.newUpiNumber.replace(/\D/g, '').slice(0, 10);
    if (this.newUpiNumber.length > 0 && !/^[6-9]/.test(this.newUpiNumber)) {
      this.upiAddError = 'Mobile number must start with 6, 7, 8, or 9.';
    } else {
      this.upiAddError = '';
    }
  }

  onAtClick(): void {
    this.showUpiSuggestions = true;
  }

  onSuffixInput(): void {
    this.newUpiSuffix     = this.newUpiSuffix.toLowerCase().replace(/[^a-z]/g, '');
    this.showUpiSuggestions = true;
    this.upiAddError      = '';
  }

  onSuffixBlur(): void {
    setTimeout(() => { this.showUpiSuggestions = false; }, 160);
  }

  selectSuffix(suffix: string): void {
    this.newUpiSuffix       = suffix;
    this.showUpiSuggestions = false;
  }

  addUpi(): void {
    const number = this.newUpiNumber.trim();
    const suffix = this.newUpiSuffix.trim().toLowerCase();

    if (!/^[6-9]\d{9}$/.test(number)) {
      this.upiAddError = 'Mobile number must be of 10 digits'; return;
    }
    if (!suffix || !this.UPI_SUFFIXES.includes(suffix)) {
      this.upiAddError = 'Please select a valid suffix from the list.'; return;
    }
    const full = `${number}@${suffix}`;
    if (this.upiList.includes(full)) {
      this.upiAddError = `${full} is already added.`; return;
    }
    if (this.upiList.length >= 3) {
      this.upiAddError = 'Maximum 3 UPI IDs allowed.'; return;
    }

    this.upiAddError = '';
    this.isSavingUpi = true;
    const newList  = [...this.upiList, full];
    const csvValue = newList.join(',');
    const raw      = this.bankForm.getRawValue();

    this.paymentSvc.saveBankDetails(this.userId, { ...raw, upiId: csvValue }).subscribe({
      next: () => {
        this.upiList      = newList;
        this.bankForm.get('upiId')?.setValue(csvValue);
        this.newUpiNumber = '';
        this.newUpiSuffix = '';
        this.isSavingUpi  = false;
        this.bankSuccess  = `${full} added!`;
        setTimeout(() => this.bankSuccess = '', 3000);
      },
      error: (err: Error) => { this.upiAddError = err.message; this.isSavingUpi = false; }
    });
  }

  removeUpi(upi: string): void {
    const newList  = this.upiList.filter(u => u !== upi);
    const csvValue = newList.join(',');
    const raw      = this.bankForm.getRawValue();

    this.paymentSvc.saveBankDetails(this.userId, { ...raw, upiId: csvValue }).subscribe({
      next: () => {
        this.upiList = newList;
        this.bankForm.get('upiId')?.setValue(csvValue);
      },
      error: () => {}
    });
  }

  formatAmount(n: number | null): string {
    if (n == null) return '—';
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  onRefInput(): void {
    this.refSearchError  = '';
    this.refSearchResult = null;
  }

  searchByRef(): void {
    const ref = this.refSearch.trim().toUpperCase();
    if (!ref) return;
    this.isSearchingRef  = true;
    this.refSearchError  = '';
    this.refSearchResult = null;
    this.paymentSvc.getByReference(ref).subscribe({
      next: (data: any) => {
        this.refSearchResult = data;
        this.isSearchingRef  = false;
      },
      error: (err: Error) => {
        this.refSearchError = err.message;
        this.isSearchingRef = false;
      }
    });
  }

  downloadReceipt(payment: any): void {
    const date = payment.paymentDate
      ? new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const method = payment.paymentMethod === 'UPI' ? 'UPI' : 'Bank Transfer';
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Payment Receipt — ${payment.referenceNumber}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:480px;margin:40px auto;color:#1a3b3a;}
  .header{text-align:center;border-bottom:2px solid #1aa37a;padding-bottom:16px;margin-bottom:20px;}
  .brand{font-size:22px;font-weight:800;color:#1aa37a;}
  .receipt-title{font-size:14px;color:#6a9e94;margin:4px 0;}
  .ref-box{background:#f0fdf4;border:1.5px solid #a7f3d0;border-radius:8px;padding:10px 16px;text-align:center;margin:16px 0;}
  .ref-num{font-size:18px;font-weight:700;color:#0f6b51;letter-spacing:1px;}
  .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eef4f2;font-size:13px;}
  .label{color:#6a9e94;font-weight:600;}
  .value{color:#1a3b3a;font-weight:700;text-align:right;}
  .amount-row{background:#f8fffd;border-radius:6px;padding:10px 16px;margin:12px 0;}
  .amount-label{font-size:12px;color:#6a9e94;}
  .amount-value{font-size:20px;font-weight:800;color:#0f6b51;}
  .footer{text-align:center;color:#9ab8b2;font-size:11px;margin-top:20px;border-top:1px solid #eef4f2;padding-top:12px;}
  .status-badge{background:#d4edda;color:#155724;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;}
</style></head><body>
<div class="header">
  <div class="brand">❤ CareConnect</div>
  <div class="receipt-title">Payment Receipt</div>
</div>
<div class="ref-box">
  <div style="font-size:11px;color:#6a9e94;margin-bottom:4px;">Reference Number</div>
  <div class="ref-num">${payment.referenceNumber || '—'}</div>
</div>
<div class="amount-row">
  <div class="amount-label">Amount</div>
  <div class="amount-value">₹${Number(payment.amount).toLocaleString('en-IN')}</div>
</div>
<div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
<div class="row"><span class="label">Patient</span><span class="value">${payment.patientName || '—'}</span></div>
<div class="row"><span class="label">Nurse</span><span class="value">${payment.nurseName || '—'}</span></div>
<div class="row"><span class="label">Care Type</span><span class="value">${payment.appointmentCareNeeds || 'Home Care'}</span></div>
<div class="row"><span class="label">Payment Method</span><span class="value">${method}</span></div>
<div class="row"><span class="label">Status</span><span class="value"><span class="status-badge">PAID</span></span></div>
<div class="footer">CareConnect — Connecting Healthcare Professionals<br>This is a simulated payment receipt for demonstration purposes.</div>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }

  parseSalaryField(description: string, key: string): string {
    if (!description) return '0';
    const part = description.split('|').find((p: string) => p.startsWith(key + '='));
    return part ? part.split('=')[1] : '0';
  }

  logout(): void { this.auth.logout(); }
}
