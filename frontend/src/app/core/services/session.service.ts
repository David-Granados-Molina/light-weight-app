import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Category } from '../models/exercise.model';
import { SessionInput, WorkoutSession } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/sessions`;

  getAll(filters?: { category?: Category; q?: string; limit?: number }): Observable<WorkoutSession[]> {
    const params: Record<string, string> = {};
    if (filters?.category) params['category'] = filters.category;
    if (filters?.q) params['q'] = filters.q;
    if (filters?.limit) params['limit'] = String(filters.limit);
    return this.http.get<WorkoutSession[]>(this.baseUrl, { params });
  }

  getOne(id: string): Observable<WorkoutSession> {
    return this.http.get<WorkoutSession>(`${this.baseUrl}/${id}`);
  }

  create(input: SessionInput): Observable<WorkoutSession> {
    return this.http.post<WorkoutSession>(this.baseUrl, input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
