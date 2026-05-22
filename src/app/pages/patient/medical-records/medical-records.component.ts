import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { MedicalRecordService } from '../../../services/medical-record.service';

interface MedicalRecord {
  id: number;
  fileName: string;
  originalFileName: string;
  type: string;
  date: string;
  notes: string;
  fileUrl: string | null;
}

@Component({
  selector: 'app-medical-records',
  templateUrl: './medical-records.component.html',
  styleUrls: ['./medical-records.component.css']
})
export class MedicalRecordsComponent implements OnInit {

  activeFilter  = 'All';
  filters       = ['All', 'Lab Report', 'Prescription', 'Imaging', 'Discharge Summary'];
  uploadOpen    = false;
  uploadSuccess = false;
  isLoading     = true;
  isUploading   = false;
  errorMsg      = '';

  selectedFile: File | null = null;
  fileError = '';

  records: MedicalRecord[] = [];
  uploadForm: FormGroup;

  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private recordService: MedicalRecordService
  ) {
    this.uploadForm = this.fb.group({
      fileName: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(30)]],
      type:     ['', Validators.required],
      notes:    ['', [Validators.minLength(10), Validators.maxLength(150)]]
    });
  }

  ngOnInit(): void { this.loadRecords(); }

  private loadRecords(): void {
    const userId = this.auth.getUserId();
    if (!userId) { this.isLoading = false; return; }

    this.recordService.getByPatient(userId).subscribe({
      next: (data) => {
        this.records   = (data || []).map((r: any) => this.mapRecord(r));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private mapRecord(r: any): MedicalRecord {
    return {
      id:              r.id,
      fileName:        r.title || r.fileName || 'Record',
      originalFileName: r.fileName || '',
      type:            r.recordType || '—',
      date:            r.createdAt
        ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—',
      notes:   r.description || '',
      fileUrl: r.fileUrl || null
    };
  }

  get filteredRecords(): MedicalRecord[] {
    if (this.activeFilter === 'All') return this.records;
    return this.records.filter(r => r.type === this.activeFilter);
  }

  countByType(type: string): number {
    return this.records.filter(r => r.type === type).length;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileError = '';
    if (!input.files?.length) { this.selectedFile = null; return; }
    const f = input.files[0];
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif',
                          'application/msword',
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(f.type)) {
      this.fileError = 'Only PDF, JPG, PNG, DOC, DOCX files allowed.';
      this.selectedFile = null;
      input.value = '';
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      this.fileError = 'File must be under 10 MB.';
      this.selectedFile = null;
      input.value = '';
      return;
    }
    this.selectedFile = f;
  }

  onUpload(): void {
    if (this.uploadForm.invalid) { this.uploadForm.markAllAsTouched(); return; }
    const userId = this.auth.getUserId();
    if (!userId) return;

    const v = this.uploadForm.value;
    this.errorMsg    = '';
    this.isUploading = true;

    this.recordService.upload(
      userId, userId, v.type, v.fileName, v.notes || undefined, this.selectedFile || undefined
    ).subscribe({
      next: (record) => {
        this.records.unshift(this.mapRecord(record));
        this.uploadForm.reset();
        this.selectedFile  = null;
        this.uploadOpen    = false;
        this.uploadSuccess = true;
        this.isUploading   = false;
        setTimeout(() => this.uploadSuccess = false, 3000);
      },
      error: (err: Error) => {
        this.errorMsg    = err.message;
        this.isUploading = false;
      }
    });
  }

  cancelUpload(): void {
    this.uploadOpen   = false;
    this.selectedFile = null;
    this.fileError    = '';
    this.uploadForm.reset();
  }

  getFileViewUrl(rec: MedicalRecord): string {
    return rec.fileUrl ? this.recordService.getFileUrl(rec.fileUrl) : '#';
  }

  deleteRecord(id: number): void {
    this.recordService.delete(id).subscribe({
      next: () => { this.records = this.records.filter(r => r.id !== id); },
      error: () => {}
    });
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'Lab Report':        return 'bi-flask';
      case 'Prescription':      return 'bi-capsule';
      case 'Imaging':           return 'bi-image';
      case 'Discharge Summary': return 'bi-file-earmark-medical';
      default:                  return 'bi-file-earmark';
    }
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'Lab Report':        return 'type-lab';
      case 'Prescription':      return 'type-rx';
      case 'Imaging':           return 'type-img';
      case 'Discharge Summary': return 'type-dis';
      default:                  return 'type-other';
    }
  }

  logout(): void { this.auth.logout(); }
}
