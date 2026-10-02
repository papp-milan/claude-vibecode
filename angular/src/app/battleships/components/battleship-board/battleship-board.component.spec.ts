import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BattleshipBoardComponent } from './battleship-board.component';

describe('BattleshipBoardComponent', () => {
  let component: BattleshipBoardComponent;
  let fixture: ComponentFixture<BattleshipBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BattleshipBoardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BattleshipBoardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
