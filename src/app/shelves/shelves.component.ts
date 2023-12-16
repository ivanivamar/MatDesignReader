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
                this.loggedUser = user;
                this.titleService.setTitle('Your Shelves');
                await this.getShelves();
                this.loading = false;
            }
        });
    }

    async getShelves() {
        this.shelves = [];
        from(this.firebaseService.GetAllShelves(this.loggedUser?.uid)).subscribe(r => {
            this.shelves = r;
            // order by title
            this.shelves.sort((a, b) => (a.name > b.name) ? 1 : -1);
        });
    }

    async viewShelf(shelf: ShelvesDto) {
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
