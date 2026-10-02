import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {TeamMembers} from '../../../constants/team-members';

type CardValue = number | 'coffee';

interface Participant {
  name: string;
  vote: CardValue | null;
}

@Component({
  selector: 'app-scrum-poker',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './scrum-poker.component.html',
  styleUrl: './scrum-poker.component.scss'
})
export class ScrumPokerComponent {
  readonly deck: CardValue[] = ['coffee', 1, 2, 5, 8, 12, 20, 40];

  participants = signal<Participant[]>(
    TeamMembers
      .map(name => ({ name, vote: null }))
  );
  selectedIndex = signal<number | null>(0);
  revealed = signal(false);
  newName = signal('');

  selectedName = computed(() => {
    const i = this.selectedIndex();
    return i === null ? null : this.participants()[i]?.name ?? null;
  });

  hasVotes = computed(() => this.participants().some(p => p.vote !== null));

  select(index: number) {
    if (this.revealed()) return;
    this.selectedIndex.set(index);
  }

  vote(value: CardValue) {
    const i = this.selectedIndex();
    if (i === null || this.revealed()) return;

    this.participants.update(list =>
      list.map((p, idx) => (idx === i ? { ...p, vote: value } : p))
    );
    this.selectFirstWithoutVote();
  }

  reveal() {
    this.revealed.set(true);
    this.selectedIndex.set(null);
  }

  newRound() {
    this.participants.update(list => list.map(p => ({ ...p, vote: null })));
    this.revealed.set(false);
    this.selectedIndex.set(this.participants().length > 0 ? 0 : null);
  }

  addParticipant() {
    const trimmed = this.newName().trim();
    if (!trimmed) return;
    this.participants.update(list => [...list, { name: trimmed, vote: null }]);
    this.newName.set('');
    if (this.selectedIndex() === null && !this.revealed()) {
      this.selectFirstWithoutVote();
    }
  }

  removeParticipant(index: number, event: Event) {
    event.stopPropagation();
    this.participants.update(list => list.filter((_, i) => i !== index));
    if (!this.revealed()) {
      this.selectFirstWithoutVote();
    }
  }

  private selectFirstWithoutVote() {
    const next = this.participants().findIndex(p => p.vote === null);
    this.selectedIndex.set(next === -1 ? null : next);
  }
}
