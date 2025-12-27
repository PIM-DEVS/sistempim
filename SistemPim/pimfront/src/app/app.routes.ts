import { Routes } from '@angular/router';
// Não precisamos mais importar os componentes de Turma aqui em cima
// import { TurmasComponent } from ...
// import { TurmaDetalhesComponent } from ...

import { LoginComponent } from './features/auth/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { ProfileComponent } from './features/profile/profile.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },

  // ROTAS PROTEGIDAS
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/main-content/main-content.component').then(
            (m) => m.MainContentComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/social/social.component').then((m) => m.SocialComponent),
      },

      // --- SEÇÃO DE TURMAS (Agora com Lazy Loading) ---

      // Rota para a lista geral (ex: /turmas)
      {
        path: 'turmas',
        loadComponent: () => import('./features/turmas/turmas').then((m) => m.TurmasComponent),
      },

      // Rota para detalhes (ex: /turmas/sala-123)
      // O ":id" é o parâmetro que o TurmaDetalhes vai ler
      {
        path: 'turmas/:id',
        loadComponent: () =>
          import('./features/turmas/turma-detalhes/turma-detalhes').then(
            (m) => m.TurmaDetalhesComponent,
          ),
      },

      { path: 'profile', component: ProfileComponent },
      { path: 'profile/:id', component: ProfileComponent },
    ],
  },
];
