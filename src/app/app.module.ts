import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    ForgotPasswordComponent,

    AdminDashboardComponent,
    PostJobComponent,
    NurseApplicationsComponent,
    ComplianceComponent,
    CredentialingComponent,
    TeamManagementComponent,
    StaffingAnalyticsComponent,

    PatientDashboardComponent,
    BookAppointmentComponent,
    MyAppointmentsComponent,
    MedicalRecordsComponent,
    SettingsComponent,
    MyNursesComponent,

    NurseDashboardComponent,
    ProfileComponent,
    JobsComponent,
    ApplicationsComponent,
    ScheduleComponent,
    PaymentsComponent,
    TrainingComponent,
    MyPatientsComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
