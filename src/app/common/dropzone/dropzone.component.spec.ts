import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropzoneComponent } from './dropzone.component';

describe('DropzoneComponent', () => {
  let component: DropzoneComponent;
  let fixture: ComponentFixture<DropzoneComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DropzoneComponent]
    });
    fixture = TestBed.createComponent(DropzoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
