import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScrumPokerComponent } from './scrum-poker.component';

describe('ScrumPokerComponent', () => {
  let component: ScrumPokerComponent;
  let fixture: ComponentFixture<ScrumPokerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScrumPokerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScrumPokerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
