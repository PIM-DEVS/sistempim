import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';

// Inicializa o app se ele ainda não existir
const app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),

    // Conecta todos os serviços ao mesmo app
    provideFirebaseApp(() => app),
    provideAuth(() => getAuth(app)),
    provideFirestore(() => getFirestore(app)),
  ],
};
