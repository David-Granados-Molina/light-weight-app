import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { AdminUser } from '../../core/models/admin.model';
import { AppAvatar } from '../../shared/components/avatar/avatar';
import { ExerciseLoader } from '../../shared/components/exercise-loader/exercise-loader';

@Component({
  selector: 'app-friends-list',
  imports: [RouterLink, AppAvatar, ExerciseLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friends-list.html',
  styleUrl: './friends-list.css',
})
export class FriendsList {
  private readonly adminService = inject(AdminService);

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);

  constructor() {
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
