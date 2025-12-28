import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private firestore = inject(Firestore);

  getAllCursos(): Observable<any[]> {
    try {
      const ref = collection(this.firestore, 'cursos');
      // Se der erro aqui, o catchError segura para não travar a tela
      return collectionData(ref, { idField: 'id' }).pipe(
        catchError(err => {
          console.error('Erro no DashboardService (Cursos):', err);
          return of([]); // Retorna lista vazia em vez de explodir
        })
      );
    } catch (e) {
      console.error('Erro crítico ao acessar Firestore:', e);
      return of([]);
    }
  }
}