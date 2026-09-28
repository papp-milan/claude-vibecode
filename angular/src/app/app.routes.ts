import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'wheel', pathMatch: 'full' },
  {
    path: 'wheel',
    loadComponent: () =>
      import('./components/wheel/wheel.component').then(m => m.WheelComponent)
  },
  {
    path: 'poker',
    loadComponent: () =>
      import('./components/scrum-poker/scrum-poker.component').then(m => m.ScrumPokerComponent)
  }
];
