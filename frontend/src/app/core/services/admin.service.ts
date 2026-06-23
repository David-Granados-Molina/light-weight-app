import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AdminUser } from '../models/admin.model';
import { Category } from '../models/exercise.model';
import { Routine } from '../models/routine.model';
import { RoutineProgressData } from '../models/progress.model';
import { WorkoutSession } from '../models/session.model';

/** Solo accesible para el usuario admin; deja consultar el historial y progreso de otros usuarios. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/admin`;

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.baseUrl}/users`);
  }

  getSessions(userId: string, filters?: { category?: Category; q?: string; from?: string; to?: string }): Observable<WorkoutSession[]> {
    const params: Record<string, string> = {};
    if (filters?.category) params['category'] = filters.category;
    if (filters?.q) params['q'] = filters.q;
    if (filters?.from) params['from'] = filters.from;
    if (filters?.to) params['to'] = filters.to;
    return this.http.get<WorkoutSession[]>(`${this.baseUrl}/users/${userId}/sessions`, { params });
  }

  getRoutines(userId: string): Observable<Routine[]> {
    return this.http.get<Routine[]>(`${this.baseUrl}/users/${userId}/routines`);
  }

  getRoutineProgress(userId: string, routineId: string): Observable<RoutineProgressData> {
    return this.http.get<RoutineProgressData>(`${this.baseUrl}/users/${userId}/progress/routine/${routineId}`);
  }
}
