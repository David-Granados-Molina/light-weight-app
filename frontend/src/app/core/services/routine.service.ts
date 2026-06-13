import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Routine, RoutineInput } from '../models/routine.model';

@Injectable({ providedIn: 'root' })
export class RoutineService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/routines`;

  getAll(): Observable<Routine[]> {
    return this.http.get<Routine[]>(this.baseUrl);
  }

  getOne(id: string): Observable<Routine> {
    return this.http.get<Routine>(`${this.baseUrl}/${id}`);
  }

  create(input: RoutineInput): Observable<Routine> {
    return this.http.post<Routine>(this.baseUrl, input);
  }

  update(id: string, input: RoutineInput): Observable<Routine> {
    return this.http.put<Routine>(`${this.baseUrl}/${id}`, input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
