import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MDividerComponent } from './m-divider.component';

describe('MDividerComponent', () => {
  let component: MDividerComponent;
  let fixture: ComponentFixture<MDividerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MDividerComponent]
    });
    fixture = TestBed.createComponent(MDividerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
