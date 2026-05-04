import { AuthService } from '../../../services/auth.service';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface Job {
  id: number;
  title: string;
  facility: string;
  location: string;
  shift: string;
  salary: string;
  type: string;
  specialty: string;
  urgency: string;
  description: string;
  requirements: string[];
  postedDaysAgo: number;
  applied: boolean;}

@Component({
  selector: 'app-jobs',
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.css']
})
export class JobsComponent implements OnInit {

  filterForm!: FormGroup;
  selectedJob: Job | null = null;
  applySuccess = false;

  allJobs: Job[] = [
    { id: 1, title: 'ICU Nurse', facility: 'Apollo Hospital', location: 'Delhi', shift: 'Night', salary: '₹55,000', type: 'Permanent', specialty: 'ICU / Critical Care', urgency: 'Urgent', description: 'Provide critical care for ICU patients, monitor vitals, administer medications, and coordinate with attending physicians.', requirements: ['BLS & ACLS Certified', '3+ years ICU experience', 'Ventilator management'], postedDaysAgo: 1, applied: false },
    { id: 2, title: 'Emergency Nurse', facility: 'Fortis Healthcare', location: 'Bangalore', shift: 'Day', salary: '₹48,000', type: 'Permanent', specialty: 'Emergency / Trauma', urgency: 'High', description: 'Handle emergency cases, triage patients, and support trauma care in a fast-paced ER environment.', requirements: ['Emergency nursing cert', '2+ years ER experience', 'Triage proficiency'], postedDaysAgo: 2, applied: false },
    { id: 3, title: 'Pediatric Nurse', facility: 'Rainbow Childrens Hospital', location: 'Hyderabad', shift: 'Morning', salary: '₹42,000', type: 'Permanent', specialty: 'Pediatric Nursing', urgency: 'Normal', description: 'Provide compassionate care to pediatric patients, administer medications, and communicate with families.', requirements: ['Pediatric nursing experience', 'Patient family communication skills'], postedDaysAgo: 3, applied: false },
    { id: 4, title: 'Home Care Nurse', facility: 'CareConnect Platform', location: 'Mumbai', shift: 'Flexible', salary: '₹35,000', type: 'Temporary', specialty: 'Home Healthcare', urgency: 'Normal', description: 'Provide in-home nursing care to elderly and post-surgery patients with personalized care plans.', requirements: ['Home care experience preferred', 'Valid driving license'], postedDaysAgo: 5, applied: false },
    { id: 5, title: 'Geriatric Care Nurse', facility: 'Silver Leaf Senior Care', location: 'Pune', shift: 'Evening', salary: '₹38,000', type: 'Permanent', specialty: 'Geriatric Care', urgency: 'Normal', description: 'Provide specialized care for elderly patients, manage chronic conditions, and support daily living activities.', requirements: ['Geriatric care experience', 'Compassion and patience'], postedDaysAgo: 7, applied: false },
    { id: 6, title: 'On-Call ICU Nurse', facility: 'AIIMS', location: 'Delhi', shift: 'Rotating', salary: '₹60,000', type: 'On-Call', specialty: 'ICU / Critical Care', urgency: 'Urgent', description: 'On-call ICU support for critical care unit during emergency shortages.', requirements: ['5+ years ICU experience', 'ACLS certified'], postedDaysAgo: 0, applied: false }
  ];

  filteredJobs: Job[] = [];

  locations   = ['All', 'Delhi', 'Bangalore', 'Hyderabad', 'Mumbai', 'Pune'];
  specialties = ['All', 'ICU / Critical Care', 'Emergency / Trauma', 'Pediatric Nursing', 'Home Healthcare', 'Geriatric Care'];
  shifts      = ['All', 'Day', 'Night', 'Morning', 'Evening', 'Rotating', 'Flexible'];
  jobTypes    = ['All', 'Permanent', 'Temporary', 'On-Call'];

  constructor(private auth: AuthService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      location:  ['All'],
      specialty: ['All'],
      shift:     ['All'],
      jobType:   ['All'],
      search:    ['']
    });
    this.filteredJobs = [...this.allJobs];
    this.filterForm.valueChanges.subscribe(() => this.applyFilters());
  }

  applyFilters() {
    const { location, specialty, shift, jobType, search } = this.filterForm.value;
    this.filteredJobs = this.allJobs.filter(j => {
      const matchLoc    = location  === 'All' || j.location  === location;
      const matchSpec   = specialty === 'All' || j.specialty === specialty;
      const matchShift  = shift     === 'All' || j.shift     === shift;
      const matchType   = jobType   === 'All' || j.type      === jobType;
      const matchSearch = !search   || j.title.toLowerCase().includes(search.toLowerCase()) || j.facility.toLowerCase().includes(search.toLowerCase());
      return matchLoc && matchSpec && matchShift && matchType && matchSearch;
    });
  }

  openDetails(job: Job) { this.selectedJob = job; this.applySuccess = false; }
  closeModal()          { this.selectedJob = null; }

  applyToJob(job: Job) {
    job.applied = true;
    this.applySuccess = true;
    setTimeout(() => { this.closeModal(); }, 1500);
  }

  urgencyClass(u: string) {
    if (u === 'Urgent') return 'badge-urgent';
    if (u === 'High')   return 'badge-high';
    return 'badge-normal';
  }
  logout(): void { this.auth.logout(); }
}
