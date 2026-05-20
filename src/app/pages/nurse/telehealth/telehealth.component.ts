import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { TelehealthService } from '../../../services/telehealth.service';
import { AppointmentService } from '../../../services/appointment.service';

type TSection = 'gallery' | 'upload' | 'record';

@Component({
  selector: 'app-telehealth',
  templateUrl: './telehealth.component.html',
  styleUrls: ['./telehealth.component.css']
})
export class TelehealthComponent implements OnInit, OnDestroy {

  @ViewChild('cameraPreview') cameraPreview!: ElementRef<HTMLVideoElement>;

  section: TSection = 'gallery';
  isLoading   = true;
  isUploading = false;
  uploadSuccess = '';
  uploadError   = '';

  myMedia:  any[] = [];
  patients: any[] = [];

  uploadForm: FormGroup;
  selectedFile: File | null = null;
  selectedFileName = '';

  // Record mode
  isRecording   = false;
  isStopped     = false;
  recordSeconds = 0;
  private stream?: MediaStream;
  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private timer?: any;
  recordedBlob: Blob | null = null;
  recordForm: FormGroup;
  recordSuccess = '';
  recordError   = '';
  isUploadingRecord = false;

  private nurseUserId!: number;
  private nurseName!:   string;

  readonly CATEGORIES = [
    'Consultation Recording',
    'Care Coaching',
    'Educational Video',
    'Medication Guidance',
    'Post-Visit Summary',
    'Follow-Up Instructions'
  ];

  constructor(
    private fb:      FormBuilder,
    private auth:    AuthService,
    private teleService: TelehealthService,
    private apptSvc: AppointmentService
  ) {
    this.uploadForm = this.fb.group({
      patientUserId: ['', Validators.required],
      title:         ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      category:      ['Consultation Recording', Validators.required],
      description:   ['', Validators.maxLength(300)]
    });
    this.recordForm = this.fb.group({
      patientUserId: ['', Validators.required],
      title:         ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      category:      ['Consultation Recording', Validators.required],
      description:   ['', Validators.maxLength(300)]
    });
  }

  ngOnInit(): void {
    const u = this.auth.getUser();
    this.nurseUserId = u?.userId;
    this.nurseName   = u?.fullName || 'Nurse';
    this.loadMedia();
    this.loadPatients();
  }

  ngOnDestroy(): void {
    this.stopStream();
    clearInterval(this.timer);
  }

  loadMedia(): void {
    this.isLoading = true;
    this.teleService.getByNurse(this.nurseUserId).subscribe({
      next: (data) => { this.myMedia = data || []; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  loadPatients(): void {
    this.apptSvc.getByNurse(this.nurseUserId).subscribe({
      next: (appts: any[]) => {
        const seen = new Set<number>();
        this.patients = (appts || [])
          .filter(a => { if (seen.has(a.patientUserId)) return false; seen.add(a.patientUserId); return true; })
          .map(a => ({ id: a.patientUserId, name: a.patientName || 'Patient' }));
      },
      error: () => {}
    });
  }

  // ── File Upload ───────────────────────────────────────────────────────────

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      this.selectedFileName = this.selectedFile.name;
    }
  }

  onUploadSubmit(): void {
    if (this.uploadForm.invalid || !this.selectedFile) {
      this.uploadForm.markAllAsTouched();
      if (!this.selectedFile) this.uploadError = 'Please select a file.';
      return;
    }
    this.isUploading = true;
    this.uploadError  = '';
    const v = this.uploadForm.value;
    const patient = this.patients.find(p => p.id == v.patientUserId);

    const fd = new FormData();
    fd.append('file',          this.selectedFile);
    fd.append('nurseUserId',   String(this.nurseUserId));
    fd.append('nurseName',     this.nurseName);
    fd.append('patientUserId', String(v.patientUserId));
    fd.append('patientName',   patient?.name || '');
    fd.append('title',         v.title);
    fd.append('category',      v.category);
    fd.append('description',   v.description || '');

    this.teleService.upload(fd).subscribe({
      next: (media) => {
        this.myMedia.unshift(media);
        this.isUploading   = false;
        this.uploadSuccess = 'Media uploaded successfully!';
        this.selectedFile  = null;
        this.selectedFileName = '';
        this.uploadForm.reset({ category: 'Consultation Recording' });
        this.section = 'gallery';
        setTimeout(() => this.uploadSuccess = '', 4000);
      },
      error: (err: Error) => { this.uploadError = err.message; this.isUploading = false; }
    });
  }

  // ── Browser Recording ─────────────────────────────────────────────────────

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.cameraPreview.nativeElement.srcObject = this.stream;
      this.cameraPreview.nativeElement.play();
      this.recorder = new MediaRecorder(this.stream, { mimeType: 'video/webm' });
      this.chunks = [];
      this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
      this.recorder.start(200);
      this.isRecording   = true;
      this.isStopped     = false;
      this.recordedBlob  = null;
      this.recordSeconds = 0;
      this.timer = setInterval(() => this.recordSeconds++, 1000);
    } catch (err) {
      this.recordError = 'Camera/microphone access denied. Please allow access in browser settings.';
    }
  }

  stopRecording(): void {
    if (!this.recorder) return;
    this.recorder.onstop = () => {
      this.recordedBlob = new Blob(this.chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(this.recordedBlob);
      const vid  = this.cameraPreview.nativeElement;
      vid.srcObject = null;
      vid.src = url;
      vid.controls = true;
      vid.pause();
    };
    this.recorder.stop();
    this.stopStream();
    this.isRecording = false;
    this.isStopped   = true;
    clearInterval(this.timer);
  }

  discardRecording(): void {
    this.recordedBlob  = null;
    this.isStopped     = false;
    this.recordSeconds = 0;
    const vid = this.cameraPreview?.nativeElement;
    if (vid) { vid.src = ''; vid.controls = false; }
  }

  onUploadRecording(): void {
    if (this.recordForm.invalid || !this.recordedBlob) {
      this.recordForm.markAllAsTouched();
      return;
    }
    this.isUploadingRecord = true;
    this.recordError = '';
    const v = this.recordForm.value;
    const patient = this.patients.find(p => p.id == v.patientUserId);
    const file = new File([this.recordedBlob], `recording_${Date.now()}.webm`, { type: 'video/webm' });

    const fd = new FormData();
    fd.append('file',          file);
    fd.append('nurseUserId',   String(this.nurseUserId));
    fd.append('nurseName',     this.nurseName);
    fd.append('patientUserId', String(v.patientUserId));
    fd.append('patientName',   patient?.name || '');
    fd.append('title',         v.title);
    fd.append('category',      v.category);
    fd.append('description',   v.description || '');

    this.teleService.upload(fd).subscribe({
      next: (media) => {
        this.myMedia.unshift(media);
        this.isUploadingRecord = false;
        this.recordSuccess = 'Recording saved successfully!';
        this.discardRecording();
        this.recordForm.reset({ category: 'Consultation Recording' });
        this.section = 'gallery';
        setTimeout(() => this.recordSuccess = '', 4000);
      },
      error: (err: Error) => { this.recordError = err.message; this.isUploadingRecord = false; }
    });
  }

  deleteMedia(item: any): void {
    this.teleService.delete(item.id).subscribe({
      next: () => { this.myMedia = this.myMedia.filter(m => m.id !== item.id); }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private stopStream(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = undefined;
  }

  fileUrl(fileName: string): string { return this.teleService.fileUrl(fileName); }

  formatTime(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  categoryIcon(cat: string): string {
    if (cat.includes('Consultation')) return 'bi-camera-video-fill';
    if (cat.includes('Coaching'))     return 'bi-person-hearts';
    if (cat.includes('Education'))    return 'bi-book-fill';
    if (cat.includes('Medication'))   return 'bi-capsule-pill';
    if (cat.includes('Post'))         return 'bi-journal-check';
    return 'bi-film';
  }

  get uf() { return this.uploadForm.controls; }
  get rf() { return this.recordForm.controls; }

  logout(): void { this.auth.logout(); }
}
