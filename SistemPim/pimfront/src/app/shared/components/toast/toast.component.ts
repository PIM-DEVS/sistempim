import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }}" [attr.data-id]="toast.id">
          <div class="toast-icon">
            <i class="bx" [ngClass]="{
              'bx-check-circle': toast.type === 'success',
              'bx-error-circle': toast.type === 'error',
              'bx-error': toast.type === 'warning',
              'bx-info-circle': toast.type === 'info'
            }"></i>
          </div>
          <span class="toast-msg">{{ toast.message }}</span>
          <button class="toast-close" (click)="toastService.remove(toast.id)">
            <i class="bx bx-x"></i>
          </button>
          <div class="toast-progress" [style.animation-duration]="toast.duration + 'ms'"></div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./toast.component.css']
})
export class ToastComponent {
  toastService = inject(ToastService);
}
