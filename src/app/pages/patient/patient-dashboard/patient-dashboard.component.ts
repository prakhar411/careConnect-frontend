import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-patient-dashboard',
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.css']
})


export class PatientDashboardComponent {

  constructor(private router: Router) {}

  patientName = "Prakhar";
  patientId = "P12345";

  greeting = "";

  goToBookAppointment() {
  this.router.navigate(['/book-appointment']);
}

goToMyAppointments() {
  this.router.navigate(['/my-appointments']);
}

goToMedicalRecords() {
  this.router.navigate(['/medical-records']);
}
  ngOnInit() {
    this.setGreeting();
  }

  setGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) {
      this.greeting = "Good Morning";
    } else if (hour < 18) {
      this.greeting = "Good Afternoon";
    } else {
      this.greeting = "Good Evening";
    }
  }

  appointments = [
    {
      nurseName: 'Nurse Emily Chen',
      date: 'Oct 24, 2024',
      time: '10:00 AM - 11:30 AM',
      status: 'Scheduled'
    },
    {
      nurseName: 'Nurse Marcus Johnson',
      date: 'Oct 28, 2024',
      time: '02:00 PM - 03:00 PM',
      status: 'Scheduled'
    }
  ];

  records = [
    {
      fileName: 'Blood_Test_Results.pdf',
      date: 'Oct 15, 2024'
    },
    {
      fileName: 'Xray_Chest_Scan.jpg',
      date: 'Oct 10, 2024'
    }
  ];

  notifications = [
    "Appointment confirmed with Nurse Emily",
    "Reminder: Upload recent records"
  ];

}