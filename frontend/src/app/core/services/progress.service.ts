import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Exercise } from '../models/exercise.model';
import { ProgressData, ProgressMetric } from '../models/progress.model';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/progress`;

  getTrackedExercises(): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(`${this.baseUrl}/exercises`);
  }

  getProgress(exerciseId: string, metric: ProgressMetric): Observable<ProgressData> {
    return this.http.get<ProgressData>(`${this.baseUrl}/${exerciseId}`, { params: { metric } });
  }
}
