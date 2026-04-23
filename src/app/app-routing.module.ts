import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { HomeComponent } from './pages/home/home.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard.component';
import { PatientDashboardComponent } from './pages/patient/patient-dashboard/patient-dashboard.component';
import { NurseDashboardComponent } from './pages/nurse/nurse-dashboard/nurse-dashboard.component';
import { BookAppointmentComponent } from './pages/patient/book-appointment/book-appointment.component';
import { MyAppointmentsComponent } from './pages/patient/my-appointments/my-appointments.component';
import { MedicalRecordsComponent } from './pages/patient/medical-records/medical-records.component';
import { SettingsComponent } from './pages/patient/settings/settings.component';
import { ProfileComponent } from './pages/nurse/profile/profile.component';
import { JobsComponent } from './pages/nurse/jobs/jobs.component';
import { ApplicationsComponent } from './pages/nurse/applications/applications.component';

const routes: Routes = [
  // { path: '', component: LoginComponent },
    { path: '', component: PatientDashboardComponent },

    { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: 'patient', component: PatientDashboardComponent },
  { path: 'nurse', component: NurseDashboardComponent },
    { path: 'patient-book-appointment', component: BookAppointmentComponent },
  { path: 'patient-appointments', component: MyAppointmentsComponent },
  { path: 'patient-medical-records', component: MedicalRecordsComponent },
  { path: 'patient-settings', component: SettingsComponent },
    { path: 'nurse-dashboard', component: NurseDashboardComponent },
  { path: 'nurse-profile', component: ProfileComponent },
  { path: 'nurse-available-jobs', component: JobsComponent },
  { path: 'nurse-applications', component: ApplicationsComponent },


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
