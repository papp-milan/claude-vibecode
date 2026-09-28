import { Routes } from '@angular/router';
import {WheelComponent} from './components/wheel/wheel.component';
import {ScrumPokerComponent} from './components/scrum-poker/scrum-poker.component';

export const routes: Routes = [
  { path: '', redirectTo: 'wheel-of-fortune', pathMatch: 'full' },
  {
    path: 'wheel-of-fortune',
    component: WheelComponent,
    title: 'Wheel Of Fortune'
  },
  {
    path: 'scrum-poker',
    component: ScrumPokerComponent,
    title: 'Scrum Poker'
  },
  {
    path: '**',
    redirectTo: 'wheel-of-fortune'
  }
];
