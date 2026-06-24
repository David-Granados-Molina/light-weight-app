import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'recuperar',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'restablecer',
    loadComponent: () => import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'inicio',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'registrar',
    canActivate: [authGuard],
    loadComponent: () => import('./features/register/register-workout').then((m) => m.RegisterWorkout),
  },
  {
    path: 'historial',
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/history').then((m) => m.History),
  },
  {
    path: 'progreso',
    canActivate: [authGuard],
    loadComponent: () => import('./features/progress/progress').then((m) => m.Progress),
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'calendario',
    canActivate: [authGuard],
    loadComponent: () => import('./features/calendar/calendar').then((m) => m.Calendar),
  },
  {
    path: 'rutinas',
    canActivate: [authGuard],
    loadComponent: () => import('./features/routines/routines-list').then((m) => m.RoutinesList),
  },
  {
    path: 'rutinas/nueva',
    canActivate: [authGuard],
    loadComponent: () => import('./features/routines/routine-form').then((m) => m.RoutineForm),
  },
  {
    path: 'rutinas/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/routines/routine-form').then((m) => m.RoutineForm),
  },
  {
    path: 'amigos',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/friends/friends-list').then((m) => m.FriendsList),
  },
  {
    path: 'amigos/:userId/historial',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/history/history').then((m) => m.History),
  },
  {
    path: 'amigos/:userId/progreso',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/progress/progress').then((m) => m.Progress),
  },
  { path: '**', redirectTo: 'inicio' },
];
