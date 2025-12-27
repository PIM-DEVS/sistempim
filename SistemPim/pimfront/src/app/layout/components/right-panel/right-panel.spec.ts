import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightPanelComponent } from './right-panel.component';

describe('RightPanel', () => {
  let component: RightPanelComponent;
  let fixture: ComponentFixture<RightPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RightPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RightPanelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
