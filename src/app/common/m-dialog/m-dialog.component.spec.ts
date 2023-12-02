import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MDialogComponent } from './m-dialog.component';

describe('MDialogComponent', () => {
  let component: MDialogComponent;
  let fixture: ComponentFixture<MDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MDialogComponent]
    });
    fixture = TestBed.createComponent(MDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
