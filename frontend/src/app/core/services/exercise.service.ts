import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Category, Exercise, ExerciseInput } from '../models/exercise.model';

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/exercises`;

  getAll(filters?: { category?: Category; q?: string }): Observable<Exercise[]> {
    const params: Record<string, string> = {};
    if (filters?.category) params['category'] = filters.category;
    if (filters?.q) params['q'] = filters.q;
    return this.http.get<Exercise[]>(this.baseUrl, { params });
  }

  create(input: ExerciseInput): Observable<Exercise> {
    return this.http.post<Exercise>(this.baseUrl, input);
  }

  update(id: string, input: Partial<ExerciseInput>): Observable<Exercise> {
    return this.http.put<Exercise>(`${this.baseUrl}/${id}`, input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
