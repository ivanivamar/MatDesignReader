import { Component, EventEmitter, Injector, Input, OnInit, Output } from "@angular/core";
import { EpubDto, IEpub, ShelvesDto, UserDto } from "../interfaces/models";
import { AppComponentBase } from "../AppComponentBase";
import { FirebaseService } from "../services/firebase.service";

@Component({
    selector: "book-card",
    templateUrl: "./book-card.component.html",
    styleUrls: ["./book-card.component.scss"],
    providers: [FirebaseService]
})

export class BookCardComponent extends AppComponentBase implements OnInit {
    @Input() fromShelves = false;
    @Input() userX: UserDto = new UserDto();
    @Input() book: any;
    @Input() shelves: ShelvesDto[] = [];
    @Output() onBookSelected: EventEmitter<EpubDto> = new EventEmitter<EpubDto>();
    @Output() onBookChanged: EventEmitter<EpubDto> = new EventEmitter<EpubDto>();
    @Output() updateShelves: EventEmitter<void> = new EventEmitter<void>();
    @Output() removeFromShelf: EventEmitter<void> = new EventEmitter<void>();

    showBookDialog = false;
    bookCreationStepsIndex = 0;
    
    newShelf = new ShelvesDto();

    constructor(
        injector: Injector,
        private firebaseService: FirebaseService,
    ) {
        super(injector);
    }

    async ngOnInit() {
        await this.getLocalizationFileData();
        this.book.showMenu = false;
    }    

    showBookMenu() {
        this.book.showMenu = !this.book.showMenu;
    }

    editBook(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.showBookDialog = true;
    }

    onBookDialogClose() {
        this.showBookDialog = false;
        this.bookCreationStepsIndex = 0;
    }

    checkIfHasBook(shelf: ShelvesDto): boolean {
        let hasBook = false;

        if (shelf.bookIds.length > 0) {
            shelf.bookIds.forEach((bId: string) => {
                if (bId === this.book.id) {
                    hasBook = true;
                }
            });
        }
        return hasBook;
    }

    toggleShelf(shelf: ShelvesDto) {
        if (shelf.bookIds.includes(this.book.id)) {
            shelf.bookIds = shelf.bookIds.filter((bId) => bId !== this.book.id);
        } else {
            shelf.bookIds.push(this.book.id);
        }
    }

    async addShelf() {
        this.newShelf.id = this.IdGenerator();
        await this.firebaseService.CreateShelf(this.newShelf, this.userX.id);
        this.shelves.push(this.newShelf);
        this.newShelf.bookIds.push(this.book.id);
        this.newShelf = new ShelvesDto();
        await this.updateShelves.emit();
    }

    UploadCover(event: any) {
        // check if is image:
        if (!event.target.files[0].type.startsWith('image')) {
            return;
        }

        this.firebaseService.uploadEpubToStorage(event.target.files[0], this.userX.id + '/' + this.book.id).then((url) => {
            this.book.cover = url;
        });
    }

    async UpdateBook(): Promise<void> {
        await this.firebaseService.Update(this.book, this.userX.id);
        this.showBookDialog = false;
    }

    async UpdateShelves() {
        this.updateShelves.emit();
    }

    async deleteBook(event: Event): Promise<void> {
        event.stopPropagation();
        event.preventDefault();
        // remove book from shelf if exists
        for (const shelf of this.shelves) {
            shelf.bookIds = shelf.bookIds.filter((bId) => bId !== this.book.id);
            await this.firebaseService.UpdateShelf(shelf, this.userX.id);
        }

        this.showBookDialog = false;
        this.book.showMenu = false;
        await this.firebaseService.Delete(this.book.id, this.userX.id);
    }

    async deleteShelf(shelf: ShelvesDto) {
        await this.firebaseService.DeleteShelf(shelf.id, this.userX.id);
        this.updateShelves.emit();
    }
}
