import {Component, Injector, OnInit} from '@angular/core';
import {User} from "firebase/auth";
import {FirebaseService} from "./common/services/firebase.service";
import {Router} from "@angular/router";
import {LocalizationService} from "./common/services/localization.service";
import {AppComponentBase} from "./common/AppComponentBase";
import {UserDto} from "./common/interfaces/models";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    providers: [FirebaseService, LocalizationService]
})
export class AppComponent extends AppComponentBase implements OnInit {
    title = 'MaterialReader';
    loading = false;
    showProfileMenu = false;

    constructor(
        injector: Injector,
        private firebaseService: FirebaseService,
        public router: Router,
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.loading = true;
        this.firebaseService.isLoggedIn().then(async user => {
            await this.firebaseService.getUserById(user.uid).then(async (user: any) => {
                this.user = user;
            });
            await this.getLocalizationFileData();
            this.loading = false;
        });
    }

    logout(): void {
        this.firebaseService.logout().then(() => {
            this.router.navigate(['login']);
        });
    }
}
