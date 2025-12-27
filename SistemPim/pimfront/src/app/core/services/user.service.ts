import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/users';

  getProfile(email: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${email}`);
  }

  updateProfile(email: string, dados: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${email}`, dados);
  }
}
