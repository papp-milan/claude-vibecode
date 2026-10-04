import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PitchCreatedNotificationComponent } from './pitch-created-notification.component';

describe('PitchCreatedNotificationComponent', () => {
  let component: PitchCreatedNotificationComponent;
  let fixture: ComponentFixture<PitchCreatedNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PitchCreatedNotificationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PitchCreatedNotificationComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the success headline by default', () => {
    fixture.detectChanges();
    const banner: HTMLElement | null = fixture.nativeElement.querySelector('.pitch-created-notification');
    expect(banner).toBeTruthy();
    expect(banner!.querySelector('.pitch-created-notification__title')!.textContent).toContain('Pitch created');
    expect(banner!.getAttribute('role')).toBe('status');
  });

  it('should render the pitch title only when provided', async () => {
    fixture.componentRef.setInput('pitchTitle', 'Neue Kampagne');
    fixture.detectChanges();
    const detail: HTMLElement | null = fixture.nativeElement.querySelector('.pitch-created-notification__detail');
    expect(detail?.textContent).toContain('Neue Kampagne');

    fixture.componentRef.setInput('pitchTitle', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pitch-created-notification__detail')).toBeNull();
  });

  it('should render nothing when not visible', () => {
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pitch-created-notification')).toBeNull();
  });

  it('should emit dismissed when the close button is clicked', () => {
    fixture.detectChanges();
    let emitted = 0;
    component.dismissed.subscribe(() => emitted++);
    const close: HTMLButtonElement = fixture.nativeElement.querySelector('.pitch-created-notification__close');
    close.click();
    expect(emitted).toBe(1);
  });
});