import { Component, ChangeDetectorRef, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { TopbarComponent } from '../components/topbar/topbar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css'],
})
export class MainLayoutComponent {
  
  // Injete o detector
  private cdr = inject(ChangeDetectorRef); 

  isMobileMenuOpen = false;

  toggleMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    console.log('Estado alterado para:', this.isMobileMenuOpen);
    
    // !!! COMANDO DE FORÇA BRUTA !!!
    this.cdr.detectChanges(); 
  }

  closeMenu() {
    this.isMobileMenuOpen = false;
    this.cdr.detectChanges(); // Força aqui também
  }
}