import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

const ROLE_HOME: Record<string, string> = {
  ORGANIZATION:    '/admin',
  PATIENT:         '/patient',
  NURSE:           '/nurse',
  PLATFORM_ADMIN:  '/platform-admin',
};

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth     = inject(AuthService);
  const router   = inject(Router);
  const required: string = route.data['role'];
  const actual   = (auth.getRole() ?? '').toUpperCase();

  if (actual === required.toUpperCase()) return true;

  // Redirect to their own dashboard instead of showing an error
  const home = ROLE_HOME[actual] ?? '/login';
  router.navigate([home]);
  return false;
};
