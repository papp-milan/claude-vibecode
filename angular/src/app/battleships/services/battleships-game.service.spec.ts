import { TestBed } from '@angular/core/testing';
import { BattleshipsGameService } from './battleships-game.service';

describe('BattleshipsGameService', () => {
  let service: BattleshipsGameService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BattleshipsGameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
