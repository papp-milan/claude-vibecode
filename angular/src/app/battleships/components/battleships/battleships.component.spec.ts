import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BattleshipsComponent } from './battleships.component';

describe('BattleshipsComponent', () => {
  let component: BattleshipsComponent;
  let fixture: ComponentFixture<BattleshipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BattleshipsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BattleshipsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
