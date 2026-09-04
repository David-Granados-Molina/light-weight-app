import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Diet, DietInput } from '../models/diet.model';

/** La dieta de quien está dentro. Una por usuario; el servidor la crea vacía la primera vez. */
@Injectable({ providedIn: 'root' })
export class DietService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/diet`;

  get(): Observable<Diet> {
    return this.http.get<Diet>(this.baseUrl);
  }

  /** Sustituye la dieta entera; no hay guardado parcial. */
  save(input: DietInput): Observable<Diet> {
    return this.http.put<Diet>(this.baseUrl, input);
  }
}
