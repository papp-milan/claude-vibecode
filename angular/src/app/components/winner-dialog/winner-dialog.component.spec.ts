import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WinnerDialogComponent } from './winner-dialog.component';

describe('WinnerDialogComponent', () => {
  let component: WinnerDialogComponent;
  let fixture: ComponentFixture<WinnerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WinnerDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WinnerDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
