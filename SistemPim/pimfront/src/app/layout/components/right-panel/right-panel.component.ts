import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.css'],
})
export class RightPanelComponent {
  @Input() isOpen = false;

  // 1. Dados dos mentores (que o HTML estava procurando)
  mentors = [
    {
      name: 'Thomas Edward',
      role: '@thewildwithyou',
      image: 'https://i.pravatar.cc/150?u=thomas',
      isFollowing: false,
    },
    {
      name: 'Chris Doe',
      role: '@chrisdoe',
      image: 'https://i.pravatar.cc/150?u=chris',
      isFollowing: true,
    },
    {
      name: 'Emilie Jones',
      role: '@emiliejones',
      image: 'https://i.pravatar.cc/150?u=emilie',
      isFollowing: false,
    },
    {
      name: 'Jessica Williams',
      role: '@jessicawilliams',
      image: 'https://i.pravatar.cc/150?u=jessica',
      isFollowing: true,
    },
  ];

  // 2. Função para seguir/deixar de seguir
  toggleFollow(mentor: any) {
    mentor.isFollowing = !mentor.isFollowing;
  }
}
