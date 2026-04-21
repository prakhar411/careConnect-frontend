import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { HomeComponent } from './pages/home/home.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard.component';
import { PatientDashboardComponent } from './pages/patient/patient-dashboard/patient-dashboard.component';
import { NurseDashboardComponent } from './pages/nurse/nurse-dashboard/nurse-dashboard.component';
import { FormsModule } from '@angular/forms';
import { MyAppointmentsComponent } from './pages/patient/my-appointments/my-appointments.component';
import { MedicalRecordsComponent } from './pages/patient/medical-records/medical-records.component';
import { SettingsComponent } from './pages/patient/settings/settings.component';
import { BookAppointmentComponent } from './pages/patient/book-appointment/book-appointment.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    AdminDashboardComponent,
    PatientDashboardComponent,
    NurseDashboardComponent,
    BookAppointmentComponent,
    MyAppointmentsComponent,
    MedicalRecordsComponent,
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
