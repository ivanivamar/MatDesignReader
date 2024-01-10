import { NO_ERRORS_SCHEMA } from "@angular/core";
import { BookCardComponent } from "./book-card.component";
import { ComponentFixture, TestBed } from "@angular/core/testing";

describe("BookCardComponent", () => {

  let fixture: ComponentFixture<BookCardComponent>;
  let component: BookCardComponent;
  beforeEach(() => {
    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
      ],
      declarations: [BookCardComponent]
    });

    fixture = TestBed.createComponent(BookCardComponent);
    component = fixture.componentInstance;

  });

  it("should be able to create component instance", () => {
    expect(component).toBeDefined();
  });
  
});
