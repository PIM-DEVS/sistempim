import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html', 
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  @Output() switchToLogin = new EventEmitter<void>(); 

  user = {
    name: '',
    email: '',
    password: '',
  };

  constructor(private apiService: ApiService) {}

  onSubmit() {
    this.apiService.registerUser(this.user).subscribe({
      next: (res: any) => {
        alert('Conta criada com sucesso! Faça login.');
        this.switchToLogin.emit();
      },
      error: (err: any) => {
        console.error(err);
        alert('Erro ao criar conta.');
      },
    });
  }

  goToLogin() {
    this.switchToLogin.emit();
  }
}
