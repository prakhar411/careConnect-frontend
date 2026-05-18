import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { AuthService }        from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';
import { PatientService }     from '../../../services/patient.service';

@Component({
  selector: 'app-emergency-request',
  templateUrl: './emergency-request.component.html',
  styleUrls: ['./emergency-request.component.css']
})
export class EmergencyRequestComponent implements OnInit, OnDestroy {

  step: 'form' | 'waiting' | 'responded' = 'form';
  isLoading   = false;
  submitError = '';

  private userId!: number;

  // ── Multi-symptom selection ──────────────────────────────────────────────
  selectedTypes = new Set<string>();

  // ── Form fields ──────────────────────────────────────────────────────────
  description     = '';
  descriptionError = '';
  patientName     = '';
  countryCode     = '+91';
  phone           = '';
  phoneError      = '';
  address         = '';
  city            = '';

  readonly COUNTRY_CODES = [
    { code: '+91',  flag: '🇮🇳', label: 'IN' },
    { code: '+1',   flag: '🇺🇸', label: 'US' },
    { code: '+44',  flag: '🇬🇧', label: 'GB' },
    { code: '+971', flag: '🇦🇪', label: 'AE' },
    { code: '+61',  flag: '🇦🇺', label: 'AU' },
    { code: '+65',  flag: '🇸🇬', label: 'SG' },
  ];

  // ── Location fetch ───────────────────────────────────────────────────────
  isFetchingLocation = false;
  locationError      = '';

  // ── Active emergency ─────────────────────────────────────────────────────
  activeRequest: any      = null;
  respondingNurses: any[] = [];
  private pollTimer?: any;

  readonly EMERGENCY_TYPES = [
    { value: 'CHEST_PAIN',  label: '❤️ Chest Pain / Heart Attack' },
    { value: 'BREATHING',   label: '🫁 Breathing Difficulty'       },
    { value: 'FALL',        label: '🦴 Fall / Injury'              },
    { value: 'FEVER',       label: '🌡️ High Fever'                 },
    { value: 'STROKE',      label: '🧠 Stroke Symptoms'            },
    { value: 'DIABETIC',    label: '💉 Diabetic Emergency'         },
    { value: 'ALLERGIC',    label: '⚠️ Severe Allergic Reaction'   },
    { value: 'UNCONSCIOUS', label: '🆘 Unconscious / Unresponsive' },
    { value: 'OTHER',       label: '🏥 Other Emergency'            },
  ];

  readonly PROTOCOLS: Record<string, { title: string; steps: string[] }> = {
    CHEST_PAIN:  { title: 'Chest Pain — While You Wait',
      steps: ['Have patient sit or lie down comfortably', 'Loosen tight clothing (collar, belt)', 'Give aspirin 325mg if not allergic and conscious', 'Do NOT give food or water', 'Monitor pulse and breathing every 2 minutes', 'Be ready to perform CPR if patient becomes unresponsive'] },
    BREATHING:   { title: 'Breathing Difficulty — While You Wait',
      steps: ['Sit patient upright — never lay flat', 'Open windows for fresh air', 'Use prescribed inhaler if available (2 puffs)', 'Loosen collar and clothing', 'Stay calm and reassure patient', 'If lips turn blue — call 108 immediately'] },
    FALL:        { title: 'Fall / Injury — While You Wait',
      steps: ['Do NOT move patient if spine injury is suspected', 'Apply firm pressure to any bleeding wound', 'Apply ice pack wrapped in cloth for swelling', 'Keep patient warm and still', 'Check for consciousness and breathing every 2 minutes', 'Do NOT give food or water'] },
    FEVER:       { title: 'High Fever — While You Wait',
      steps: ['Place cool damp cloth on forehead and neck', 'Give plenty of fluids (water, ORS) if conscious', 'Paracetamol 500mg if available and patient is adult', 'Remove excess clothing and blankets', 'Monitor temperature every 10 minutes', 'Seek emergency if temperature exceeds 104°F (40°C)'] },
    STROKE:      { title: 'Stroke — FAST Check & While You Wait',
      steps: ['FACE: Ask to smile — is one side drooping?', 'ARMS: Ask to raise both arms — does one drift down?', 'SPEECH: Ask to repeat a sentence — is it slurred?', 'TIME: Note the exact time symptoms started', 'Lay patient on side if vomiting', 'Do NOT give food, water, or medication'] },
    DIABETIC:    { title: 'Diabetic Emergency — While You Wait',
      steps: ['If conscious: give 15g sugar (3 tsp, juice, or glucose tablets)', 'Wait 15 min, check if improving', 'If unconscious: do NOT give anything by mouth', 'Place unconscious patient in recovery position', 'Note last meal time and insulin dose taken', 'Monitor breathing every 2 minutes'] },
    ALLERGIC:    { title: 'Allergic Reaction — While You Wait',
      steps: ['Use epinephrine auto-injector (EpiPen) if available — outer thigh', 'Have patient lie down with legs elevated (unless breathing difficulty)', 'Remove or avoid the allergen if identifiable', 'Do NOT give antihistamines as primary treatment for anaphylaxis', 'Monitor airway — be ready for CPR', 'Call 108 immediately — anaphylaxis is life-threatening'] },
    UNCONSCIOUS: { title: 'Unconscious Patient — While You Wait',
      steps: ['Check for response — tap shoulders, call name', 'Open airway: tilt head back, lift chin', 'Look, listen, feel for breathing (10 seconds)', 'If not breathing — start CPR: 30 compressions, 2 breaths', 'If breathing — place in recovery position (on side)', 'Do not leave patient alone at any time'] },
    OTHER:       { title: 'General Emergency — While You Wait',
      steps: ['Keep patient calm and still', 'Ensure clear airway at all times', 'Monitor pulse and breathing', 'Keep patient warm', 'Do not give food or water unless directed', 'Be ready to provide location to arriving nurse'] },
  };

  // ── Multi-symptom helpers ────────────────────────────────────────────────

  toggleType(val: string): void {
    if (this.selectedTypes.has(val)) this.selectedTypes.delete(val);
    else this.selectedTypes.add(val);
    this.submitError = '';
  }

  isSelected(val: string): boolean { return this.selectedTypes.has(val); }

  get primaryType(): string {
    return this.selectedTypes.size > 0 ? Array.from(this.selectedTypes)[0] : '';
  }

  get selectedLabels(): string {
    return Array.from(this.selectedTypes)
      .map(v => this.EMERGENCY_TYPES.find(t => t.value === v)?.label || v)
      .join(' + ');
  }

  get currentProtocol() {
    return this.PROTOCOLS[this.primaryType] || this.PROTOCOLS['OTHER'];
  }

  get selectedProtocols(): { title: string; steps: string[] }[] {
    if (this.selectedTypes.size === 0) return [this.PROTOCOLS['OTHER']];
    const seen = new Set<{ title: string; steps: string[] }>();
    const result: { title: string; steps: string[] }[] = [];
    for (const v of Array.from(this.selectedTypes)) {
      const p = this.PROTOCOLS[v] || this.PROTOCOLS['OTHER'];
      if (!seen.has(p)) { seen.add(p); result.push(p); }
    }
    return result;
  }

  // ── Description validation ───────────────────────────────────────────────
  readonly DESC_MAX = 200;
  readonly DESC_PATTERN = /^[A-Za-z0-9 ,.'\-()!?°%]*$/;

  get descLen(): number { return this.description.length; }

  onDescInput(): void {
    const v = this.description;
    if (v.length > 0 && v.length < 10) {
      this.descriptionError = 'Description must be at least 10 characters.';
    } else if (!this.DESC_PATTERN.test(v)) {
      // Strip invalid chars
      this.description = v.replace(/[^A-Za-z0-9 ,.'\-()!?°%]/g, '');
      this.descriptionError = 'Special characters are not allowed.';
    } else {
      this.descriptionError = '';
    }
  }

  blockInvalidDescChar(event: KeyboardEvent): boolean {
    const allowed = /^[A-Za-z0-9 ,.'\-()!?°%]$/;
    if (!allowed.test(event.key) &&
        !['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End','Enter'].includes(event.key)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onPhoneInput(): void {
    this.phone = this.phone.replace(/\D/g, '');
    if (this.countryCode === '+91') {
      if (this.phone.length > 0 && !/^[6789]/.test(this.phone)) {
        this.phoneError = 'Number must start with 6, 7, 8, or 9.';
      } else if (this.phone.length > 0 && this.phone.length < 10) {
        this.phoneError = `Enter exactly 10 digits (${this.phone.length}/10).`;
      } else {
        this.phoneError = '';
      }
    } else {
      this.phoneError = '';
    }
  }

  onCountryCodeChange(): void {
    this.phone = '';
    this.phoneError = '';
  }

  blockNonDigit(event: KeyboardEvent): void {
    const nav = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
    if (!nav.includes(event.key) && !/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  // ── Location auto-fetch ──────────────────────────────────────────────────

  fetchLocation(): void {
    if (!navigator.geolocation) {
      this.locationError = 'Your browser does not support location. Please enter address manually.';
      return;
    }
    this.isFetchingLocation = true;
    this.locationError      = '';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.http.get<any>(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        ).subscribe({
          next: (data) => {
            const a = data.address || {};
            const parts = [
              a.house_number ? `${a.house_number}, ` + (a.road || a.pedestrian || '') : (a.road || a.pedestrian || a.footway || ''),
              a.neighbourhood || a.suburb || a.quarter || '',
              a.city || a.town || a.village || '',
              a.state || '',
            ].map(s => s.trim()).filter(Boolean);
            this.address            = parts.join(', ');
            this.city               = a.city || a.town || a.village || '';
            this.isFetchingLocation = false;
          },
          error: () => {
            // Fallback: show coordinates
            this.address            = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            this.isFetchingLocation = false;
            this.locationError      = 'Could not convert to address — coordinates saved. You can edit if needed.';
          }
        });
      },
      (err) => {
        this.isFetchingLocation = false;
        this.locationError = err.code === 1
          ? 'Location permission denied. Please allow location access in your browser, or enter address manually.'
          : err.code === 2
          ? 'Location unavailable. Please enter address manually.'
          : 'Location request timed out. Please enter address manually.';
      },
      { timeout: 12000, enableHighAccuracy: false }
    );
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  submitEmergency(): void {
    if (this.selectedTypes.size === 0) {
      this.submitError = 'Please select at least one emergency symptom.'; return;
    }
    if (this.description && (this.description.length < 10 || this.descriptionError)) {
      this.submitError = 'Please fix the description errors before submitting.'; return;
    }
    if (this.countryCode === '+91' && this.phone && !/^[6789]\d{9}$/.test(this.phone)) {
      this.submitError = 'Please enter a valid 10-digit Indian mobile number.'; return;
    }
    this.isLoading   = true;
    this.submitError = '';

    const now     = new Date();
    const typeStr = Array.from(this.selectedTypes).join(',');
    const payload = {
      appointmentDate:     new Date(now.getTime() + 60000).toISOString(),
      careNeeds:           this.selectedLabels || 'Emergency',
      requiredSkills:      'Emergency Response, First Aid',
      scheduleType:        'ONE_TIME',
      priority:            'Critical',
      isEmergency:         true,
      emergencyType:       typeStr,
      notes:               this.description || '',
      patientFirstName:    this.patientName.split(' ')[0] || '',
      patientLastName:     this.patientName.split(' ').slice(1).join(' ') || '',
      patientPhone:        this.phone ? this.countryCode + this.phone : '',
      patientAddressLine1: this.address,
      patientCity:         this.city,
    };

    this.apptService.bookAppointment(this.userId, payload).subscribe({
      next: (appt: any) => {
        this.activeRequest = appt;
        this.isLoading     = false;
        this.step          = 'waiting';
        this.startPoll();
      },
      error: (err: Error) => { this.submitError = err.message; this.isLoading = false; }
    });
  }

  // ── Poll ─────────────────────────────────────────────────────────────────

  private startPoll(): void {
    this.pollTimer = setInterval(() => {
      if (!this.activeRequest) return;
      this.apptService.getAppointmentApplications(this.activeRequest.id).subscribe({
        next: (apps: any[]) => {
          if (apps?.length > 0) this.respondingNurses = apps;
        }, error: () => {}
      });
      this.apptService.getEmergencyByPatient(this.userId).subscribe({
        next: (data: any[]) => {
          const upd = (data || []).find((a: any) => a.id === this.activeRequest?.id);
          if (upd) {
            this.activeRequest = upd;
            if (upd.nurseId) { this.step = 'responded'; this.stopPoll(); }
          }
        }, error: () => {}
      });
    }, 10000);
  }

  private stopPoll(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = undefined; }
  }

  // ── Lifecycle + helpers ───────────────────────────────────────────────────

  constructor(
    private auth:        AuthService,
    private apptService: AppointmentService,
    private patientSvc:  PatientService,
    private http:        HttpClient
  ) {}

  ngOnInit(): void {
    this.userId = this.auth.getUserId()!;
    this.loadProfile();
    this.checkActiveEmergency();
  }

  ngOnDestroy(): void { this.stopPoll(); }

  private loadProfile(): void {
    this.patientSvc.getProfile(this.userId).subscribe({
      next: (p: any) => {
        if (!p) return;
        this.patientName = p.fullName || '';
        const raw = (p.phone || '').replace(/\D/g, '');
        this.phone = raw.length === 12 && raw.startsWith('91') ? raw.slice(2) : raw;
        this.city        = p.city     || '';
        this.address     = [p.addressLine1, p.city, p.state].filter(Boolean).join(', ');
      }, error: () => {}
    });
  }

  private checkActiveEmergency(): void {
    this.apptService.getEmergencyByPatient(this.userId).subscribe({
      next: (data: any[]) => {
        const active = (data || []).find((a: any) =>
          ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes((a.status || '').toUpperCase())
        );
        if (active) {
          this.activeRequest = active;
          // Restore selected types from stored emergencyType
          const stored = (active.emergencyType || '').split(',').map((s: string) => s.trim()).filter(Boolean);
          this.selectedTypes = new Set(stored);
          this.step = active.nurseId ? 'responded' : 'waiting';
          if (this.step === 'waiting') this.startPoll();
        }
      }, error: () => {}
    });
  }

  selectRespondingNurse(app: any): void {
    this.apptService.acceptAppointmentApplication(app.id).subscribe({
      next: (updated: any) => { this.activeRequest = updated; this.step = 'responded'; this.stopPoll(); },
      error: () => {}
    });
  }

  cancelEmergency(): void {
    if (!this.activeRequest) return;
    this.apptService.cancel(this.activeRequest.id).subscribe({
      next: () => { this.activeRequest = null; this.selectedTypes.clear(); this.step = 'form'; this.stopPoll(); },
      error: () => {}
    });
  }

  callNumber(num: string): void { window.location.href = 'tel:' + num; }
  newEmergency(): void { this.step = 'form'; this.activeRequest = null; this.selectedTypes.clear(); this.stopPoll(); }
  logout(): void { this.auth.logout(); }
}
