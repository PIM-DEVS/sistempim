import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurmaDetalhesComponent } from './turma-detalhes';

describe('TurmaDetalhes', () => {
  let component: TurmaDetalhesComponent;
  let fixture: ComponentFixture<TurmaDetalhesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurmaDetalhesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TurmaDetalhesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
