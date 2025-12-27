import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// O import do Layout:
import { MainLayoutComponent } from '../../../layout/main-layout/main-layout.component';

// Interfaces (podem ficar aqui ou em arquivo separado)
interface Course {
  category: string;
  title: string;
  time: string;
  progress: number;
  color: string;
  image: string;
}

interface ClassSession {
  code: string;
  subject: string;
  professor: string;
  room: string;
  time: string;
  color: string;
}

@Component({
  selector: 'app-main-content',
  standalone: true,
  // AQUI É O PULO DO GATO: Importar o Layout para usar no HTML
  imports: [CommonModule],
  templateUrl: './main-content.component.html',
  styleUrl: './main-content.component.css',
})
export class MainContentComponent {
  // SEÇÃO 1: CURSOS
  courses: Course[] = [
    {
      category: 'Design',
      title: 'UI/UX Fundamental',
      time: '1h 30m',
      progress: 75,
      color: '#E91E63',
      image: 'bx-paint',
    },
    {
      category: 'Dev',
      title: 'Angular Avançado',
      time: '12h 10m',
      progress: 30,
      color: '#00Bfa5',
      image: 'bx-code-alt',
    },
    {
      category: 'Database',
      title: 'SQL Mastery',
      time: '5h 45m',
      progress: 90,
      color: '#2196F3',
      image: 'bx-data',
    },
    {
      category: 'Dev',
      title: 'Node.js Backend',
      time: '8h 00m',
      progress: 10,
      color: '#00Bfa5',
      image: 'bx-server',
    },
  ];

  // SEÇÃO 2: TURMAS
  activeClasses: ClassSession[] = [
    {
      code: 'T-901',
      subject: 'Desenvolvimento Web II',
      professor: 'Prof. Ricardo',
      room: 'Lab 03',
      time: 'Seg - 19:00',
      color: '#00Bfa5',
    },
    {
      code: 'T-805',
      subject: 'Banco de Dados Avançado',
      professor: 'Profa. Amanda',
      room: 'Lab 01',
      time: 'Qua - 20:40',
      color: '#6C5DD3',
    },
    {
      code: 'T-102',
      subject: 'Gestão de Projetos',
      professor: 'Prof. Carlos',
      room: 'Sala B12',
      time: 'Sex - 19:00',
      color: '#FF9F43',
    },
  ];

  // AÇÕES
  continueCourse(courseTitle: string) {
    alert(`Abrindo o módulo: ${courseTitle}...`);
  }

  enterClass(classCode: string) {
    alert(`Entrando na sala virtual da turma ${classCode}...`);
  }
}
