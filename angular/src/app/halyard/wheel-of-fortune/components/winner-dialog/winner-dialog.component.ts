import {
  Component,
  OnDestroy,
  AfterViewInit,
  Inject
} from '@angular/core';

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface WinnerDialogData {
  winner: string;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
}

@Component({
  selector: 'app-winner-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './winner-dialog.component.html',
  styleUrl: './winner-dialog.component.scss'
})
export class WinnerDialogComponent implements AfterViewInit, OnDestroy {

  private canvas: HTMLCanvasElement | null = null;
  private animationFrame: number | null = null;
  private particles: Particle[] = [];

  constructor(
    public dialogRef: MatDialogRef<WinnerDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA)
    public data: WinnerDialogData
  ) {}

  ngAfterViewInit(): void {
    // Warten, damit der Dialog vollständig gerendert wurde
    requestAnimationFrame(() => {
      this.startConfetti();
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.canvas?.remove();
    this.canvas = null;
  }

  remove(): void {
    this.dialogRef.close(true);
  }

private startConfetti(): void {
  this.canvas = document.createElement('canvas');

  this.canvas.style.position = 'fixed';
  this.canvas.style.inset = '0';
  this.canvas.style.width = '100vw';
  this.canvas.style.height = '100vh';
  this.canvas.style.pointerEvents = 'none';
  this.canvas.style.zIndex = '9999';

  document.body.appendChild(this.canvas);

  const ctx = this.canvas.getContext('2d');

  if (!ctx) {
    this.canvas.remove();
    this.canvas = null;
    return;
  }

  this.resizeCanvas();

  const dialog = document.querySelector(
    '.winner-dialog'
  ) as HTMLElement | null;

  const dialogRect = dialog?.getBoundingClientRect();

  const centerX = dialogRect
    ? dialogRect.left + dialogRect.width / 2
    : window.innerWidth / 2;

  const centerY = dialogRect
    ? dialogRect.top + dialogRect.height / 2
    : window.innerHeight / 2;

  const colors = [
    '#1565c0',
    '#42a5f5',
    '#90caf9',
    '#ffffff',
    '#ffd54f',
    '#ff5252',
    '#69f0ae',
    '#ff4081'
  ];

  /*
   * Große erste Explosion
   */
  this.particles = Array.from({ length: 450 }, () => {
    const angle =
      Math.random() * Math.PI * 2;

    const speed =
      4 + Math.random() * 14;

    return {
      x:
        centerX +
        (Math.random() - 0.5) * 60,

      y:
        centerY +
        (Math.random() - 0.5) * 60,

      size:
        4 + Math.random() * 8,

      speedX:
        Math.cos(angle) * speed,

      speedY:
        Math.sin(angle) * speed,

      rotation:
        Math.random() * 360,

      rotationSpeed:
        -10 + Math.random() * 20,

      color:
        colors[
          Math.floor(
            Math.random() * colors.length
          )
        ]
    };
  });

  let elapsed = 0;

  const duration = 8000;

  /*
   * Während der ersten Sekunden immer wieder
   * neues Konfetti aus dem Dialog erzeugen.
   */
  const spawnConfetti = () => {
    for (let i = 0; i < 25; i++) {
      const angle =
        Math.random() * Math.PI * 2;

      const speed =
        3 + Math.random() * 10;

      this.particles.push({
        x:
          centerX +
          (Math.random() - 0.5) * 80,

        y:
          centerY +
          (Math.random() - 0.5) * 80,

        size:
          4 + Math.random() * 8,

        speedX:
          Math.cos(angle) * speed,

        speedY:
          Math.sin(angle) * speed,

        rotation:
          Math.random() * 360,

        rotationSpeed:
          -10 + Math.random() * 20,

        color:
          colors[
            Math.floor(
              Math.random() * colors.length
            )
          ]
      });
    }
  };

  let lastSpawn = 0;

  const animate = () => {
    if (!this.canvas) {
      return;
    }

    elapsed += 16;

    ctx.clearRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    /*
     * Alle ~100 ms neue Konfetti-Partikel
     */
    if (
      elapsed - lastSpawn > 200 &&
      elapsed < 4000
    ) {
      spawnConfetti();
      lastSpawn = elapsed;
    }

    for (const particle of this.particles) {

      /*
       * Gravity
       */
      particle.speedY += 0.12;

      /*
       * Leichter Luftwiderstand
       */
      particle.speedX *= 0.995;

      particle.x += particle.speedX;
      particle.y += particle.speedY;

      particle.rotation +=
        particle.rotationSpeed;

      ctx.save();

      ctx.translate(
        particle.x,
        particle.y
      );

      ctx.rotate(
        particle.rotation *
        Math.PI /
        180
      );

      ctx.fillStyle =
        particle.color;

      ctx.fillRect(
        -particle.size / 2,
        -particle.size / 2,
        particle.size,
        particle.size * 0.6
      );

      ctx.restore();
    }

    if (elapsed < duration) {
      this.animationFrame =
        requestAnimationFrame(animate);
    } else {
      ctx.clearRect(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      this.canvas.remove();
      this.canvas = null;
      this.animationFrame = null;
    }
  };

  this.animationFrame =
    requestAnimationFrame(animate);
}

  private resizeCanvas(): void {
    if (!this.canvas) {
      return;
    }

    this.canvas.width =
      window.innerWidth;

    this.canvas.height =
      window.innerHeight;
  }
}
