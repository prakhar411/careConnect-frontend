import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { HomeComponent } from './pages/home/home.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';

import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard.component';
import { PostJobComponent } from './pages/admin/post-job/post-job.component';
import { NurseApplicationsComponent } from './pages/admin/nurse-applications/nurse-applications.component';
import { ComplianceComponent } from './pages/admin/compliance/compliance.component';
import { CredentialingComponent } from './pages/admin/credentialing/credentialing.component';
import { TeamManagementComponent } from './pages/admin/team-management/team-management.component';
import { StaffingAnalyticsComponent } from './pages/admin/staffing-analytics/staffing-analytics.component';

import { PatientDashboardComponent } from './pages/patient/patient-dashboard/patient-dashboard.component';
import { BookAppointmentComponent } from './pages/patient/book-appointment/book-appointment.component';
import { MyAppointmentsComponent } from './pages/patient/my-appointments/my-appointments.component';
import { MedicalRecordsComponent } from './pages/patient/medical-records/medical-records.component';
import { SettingsComponent } from './pages/patient/settings/settings.component';
import { MyNursesComponent } from './pages/patient/my-nurses/my-nurses.component';

import { NurseDashboardComponent } from './pages/nurse/nurse-dashboard/nurse-dashboard.component';
import { ProfileComponent } from './pages/nurse/profile/profile.component';
import { JobsComponent } from './pages/nurse/jobs/jobs.component';
import { ApplicationsComponent } from './pages/nurse/applications/applications.component';
import { ScheduleComponent } from './pages/nurse/schedule/schedule.component';
import { PaymentsComponent } from './pages/nurse/payments/payments.component';
import { TrainingComponent } from './pages/nurse/training/training.component';
import { MyPatientsComponent } from './pages/nurse/my-patients/my-patients.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login',            component: LoginComponent },
  { path: 'register',         component: RegisterComponent },
  { path: 'home',             component: HomeComponent },
  { path: 'forgot-password',  component: ForgotPasswordComponent },

  // Admin
  { path: 'admin',               component: AdminDashboardComponent },
  { path: 'admin-post-job',      component: PostJobComponent },
  { path: 'admin-applications',  component: NurseApplicationsComponent },
  { path: 'admin-compliance',    component: ComplianceComponent },
  { path: 'admin-credentialing', component: CredentialingComponent },
  { path: 'admin-team',          component: TeamManagementComponent },
  { path: 'admin-analytics',     component: StaffingAnalyticsComponent },

  // Patient
  { path: 'patient',                   component: PatientDashboardComponent },
  { path: 'patient-book-appointment',  component: BookAppointmentComponent },
  { path: 'patient-appointments',      component: MyAppointmentsComponent },
  { path: 'patient-medical-records',   component: MedicalRecordsComponent },
  { path: 'patient-settings',         component: SettingsComponent },
  { path: 'patient-my-nurses',        component: MyNursesComponent },

  // Nurse
  { path: 'nurse',               component: NurseDashboardComponent },
  { path: 'nurse-dashboard',     component: NurseDashboardComponent },
  { path: 'nurse-profile',       component: ProfileComponent },
  { path: 'nurse-available-jobs',component: JobsComponent },
  { path: 'nurse-applications',  component: ApplicationsComponent },
  { path: 'nurse-schedule',      component: ScheduleComponent },
  { path: 'nurse-payments',      component: PaymentsComponent },
  { path: 'nurse-training',      component: TrainingComponent },
  { path: 'nurse-my-patients',   component: MyPatientsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
