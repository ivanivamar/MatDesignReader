import {Component, Injector, OnInit} from '@angular/core';
import {AppComponentBase} from "../common/AppComponentBase";
import {FirebaseService} from "../common/services/firebase.service";
import {HttpClient} from "@angular/common/http";
import {Router} from "@angular/router";
import {Title} from "@angular/platform-browser";
import {ShelvesDto} from "../common/interfaces/models";
import {from} from "rxjs";

@Component({
    selector: 'app-shelves',
    templateUrl: './shelves.component.html',
    styleUrls: ['./shelves.component.css'],
    providers: [FirebaseService]
})
export class ShelvesComponent extends AppComponentBase implements OnInit {
    loading = true;
    photoUrl = '';
    showProfileMenu = false;
    shelves: ShelvesDto[] = [];
    selectedShelf: ShelvesDto = new ShelvesDto();

    constructor(
        injector: Injector,
        private firebaseService: FirebaseService,
        private http: HttpClient,
        private router: Router,
        private titleService: Title
    ) {
        super(injector);
    }

    async ngOnInit(): Promise<void> {
        this.loading = true;
        await this.firebaseService.isLoggedIn().then(async user => {
            if (!user) {
                await this.router.navigate(['login']);
            } else {
                await this.firebaseService.getUserById(user.uid).then(async (user: any) => {
                    this.user = user;
                    this.loggedUser = user;
                });
                this.titleService.setTitle('Your Shelves');
                await this.getShelves();
            }
        });
    }

    async getShelves() {
        this.loading = true;
        this.shelves = [];
        from(this.firebaseService.GetAllShelves(this.user.id)).subscribe(r => {
            this.shelves = r;
            // order by title
            this.shelves.sort((a, b) => (a.name > b.name) ? 1 : -1);

            this.loading = false;
        });
    }

    async viewShelf(shelf: ShelvesDto) {
        this.selectedShelf = shelf;
        window.scrollTo(0, 0);
    }

    goBack() {
        this.selectedShelf = new ShelvesDto();
    }

    removeBookFromShelf(bookId: string) {
        console.log('remove book from shelf');
        this.selectedShelf.bookIds = this.selectedShelf.bookIds.filter((bId) => bId !== bookId);
        this.firebaseService.UpdateShelf(this.selectedShelf, this.user.id);
        this.selectedShelf.books = this.selectedShelf.books.filter((b) => b.id !== bookId);
    }
}
