import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {WheelComponent} from './components/wheel/wheel.component';

@Component({
  imports: [RouterOutlet, WheelComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('angular');
}
