import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurmasComponent } from './turmas';

describe('TurmasComponent', () => {
  let component: TurmasComponent;
  let fixture: ComponentFixture<TurmasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurmasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TurmasComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
