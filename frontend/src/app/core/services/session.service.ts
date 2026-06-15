import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Category } from '../models/exercise.model';
import { SessionInput, SessionSet, WorkoutSession } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/sessions`;

  getAll(filters?: {
    category?: Category;
    q?: string;
    exerciseId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Observable<WorkoutSession[]> {
    const params: Record<string, string> = {};
    if (filters?.category) params['category'] = filters.category;
    if (filters?.q) params['q'] = filters.q;
    if (filters?.exerciseId) params['exerciseId'] = filters.exerciseId;
    if (filters?.from) params['from'] = filters.from;
    if (filters?.to) params['to'] = filters.to;
    if (filters?.limit) params['limit'] = String(filters.limit);
    return this.http.get<WorkoutSession[]>(this.baseUrl, { params });
  }

  getOne(id: string): Observable<WorkoutSession> {
    return this.http.get<WorkoutSession>(`${this.baseUrl}/${id}`);
  }

  getByDate(date: string): Observable<WorkoutSession> {
    return this.http.get<WorkoutSession>(`${this.baseUrl}/by-date/${date}`);
  }

  getLastByExercises(exerciseIds: string[]): Observable<Record<string, { date: string; sets: SessionSet[] } | null>> {
    if (!exerciseIds.length) return of({});
    return this.http.get<Record<string, { date: string; sets: SessionSet[] } | null>>(`${this.baseUrl}/last`, {
      params: { exerciseIds: exerciseIds.join(',') },
    });
  }

  create(input: SessionInput): Observable<WorkoutSession> {
    return this.http.post<WorkoutSession>(this.baseUrl, input);
  }

  update(id: string, input: SessionInput): Observable<WorkoutSession> {
    return this.http.put<WorkoutSession>(`${this.baseUrl}/${id}`, input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
