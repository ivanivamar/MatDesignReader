import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MMenuComponent } from './m-menu.component';

describe('MMenuComponent', () => {
  let component: MMenuComponent;
  let fixture: ComponentFixture<MMenuComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MMenuComponent]
    });
    fixture = TestBed.createComponent(MMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
