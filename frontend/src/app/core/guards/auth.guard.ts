import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.init();
  return authService.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.init();
  return authService.isAuthenticated() ? router.createUrlTree(['/inicio']) : true;
};

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.init();
  if (!authService.isAuthenticated()) return router.createUrlTree(['/login']);
  return authService.currentUser()?.isAdmin ? true : router.createUrlTree(['/inicio']);
};
