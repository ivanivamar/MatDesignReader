import {Component, Injector, OnInit} from '@angular/core';
import {AppComponentBase} from "../../common/AppComponentBase";
import {FirebaseService} from "../../common/services/firebase.service";
import {Router} from "@angular/router";
import {HttpClient} from "@angular/common/http";
import {Title} from "@angular/platform-browser";
import {from} from "rxjs";
import {IEpub, EpubDto} from "../../common/interfaces/models";

@Component({
    selector: 'app-book-detail',
    templateUrl: './book-detail.component.html',
    styleUrls: ['./book-detail.component.css'],
    providers: [FirebaseService, HttpClient]
})
export class BookDetailComponent extends AppComponentBase implements OnInit {
    loading: boolean = true;
    book: EpubDto = new EpubDto();
    showDescription: boolean = false;
    shelves: any[] = [];

    constructor(
        injector: Injector,
        private firebaseService: FirebaseService,
        private router: Router,
        private http: HttpClient,
        private titleService: Title
    ) {
        super(injector);
    }

    ngOnInit() {
        this.firebaseService.isLoggedIn().then(async user => {
            if (!user) {
                this.router.navigate(['login']);
            } else {
                this.loggedUser = user;
                const id = window.location.pathname.split('/')[2];

                from(this.firebaseService.GetById(id, this.loggedUser?.uid)).subscribe(async (book) => {
                    this.book = book as EpubDto;
                    this.titleService.setTitle(this.book.title);
                    await this.getLocalizationFileData();
                    this.loading = false;
                });
                await this.getShelves();
            }
        });
    }

    async getShelves() {
        from(this.firebaseService.GetAllShelves(this.loggedUser?.uid)).subscribe(r => {
            this.shelves = r;
        });
    }

    async deleteBook(): Promise<void> {
        // remove book from shelf if exists
        for (const shelf of this.shelves) {
            shelf.bookIds = shelf.bookIds.filter((bId: string) => bId !== this.book.id);
            await this.firebaseService.UpdateShelf(shelf, this.loggedUser?.uid);
        }

        await this.firebaseService.Delete(this.book.id, this.loggedUser?.uid);
        await this.router.navigate(['/']);
    }

}
