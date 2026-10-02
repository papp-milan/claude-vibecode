import { Routes } from '@angular/router';
import {WheelComponent} from './halyard/wheel-of-fortune/components/wheel/wheel.component';
import {ScrumPokerComponent} from './halyard/scrum-poker/components/scrum-poker/scrum-poker.component';
import {BattleshipsComponent} from './battleships/components/battleships/battleships.component';

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
    path: 'battleships',
    component: BattleshipsComponent,
    title: 'Battleships'
  },
  {
    path: '**',
    redirectTo: 'wheel-of-fortune'
  }
];
