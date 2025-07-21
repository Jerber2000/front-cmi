//auth.guard.ts

import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const token = localStorage.getItem('token');
  const router = inject(Router);

  if (token) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};
