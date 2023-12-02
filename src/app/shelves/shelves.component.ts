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
    loading = false;
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

    ngOnInit(): void {
        this.firebaseService.isLoggedIn().then(user => {
            if (!user) {
                this.router.navigate(['login']);
            } else {
                this.loggedUser = user;
                this.photoUrl = user.photoURL ? user.photoURL : '';
                console.log("USER:", this.loggedUser);
                this.titleService.setTitle('Your Shelves');
                this.getShelves();
            }
        });
    }

    getShelves() {
        this.shelves = [];
        from(this.firebaseService.GetAllShelves(this.loggedUser?.uid)).subscribe(r => {
            r.forEach((doc: any) => {
                this.shelves.push(doc.data());
            });
            // order by title
            this.shelves.sort((a, b) => (a.name > b.name) ? 1 : -1);
        });
    }

    viewShelf(shelf: ShelvesDto) {
        shelf.books.reverse();
        this.selectedShelf = shelf;
        window.scrollTo(0, 0);
    }

    goBack() {
        this.selectedShelf = new ShelvesDto();
    }

    logout(): void {
        this.firebaseService.logout().then(() => {
            this.router.navigate(['login']);
        });
    }

    protected readonly ShelvesDto = ShelvesDto;
}
