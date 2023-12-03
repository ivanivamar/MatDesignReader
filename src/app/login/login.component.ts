import {Component, Injector, OnInit} from '@angular/core';
import {FirebaseService} from "../common/services/firebase.service";
import {Router} from "@angular/router";
import {AppComponentBase} from "../common/AppComponentBase";

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    providers: [FirebaseService]
})
export class LoginComponent extends AppComponentBase implements OnInit {
    loading = false;

    constructor(
        injector: Injector,
        private firebaseService: FirebaseService,
        private router: Router,
    ) {
        super(injector);
    }

    async ngOnInit(): Promise<void> {
        this.loading = true;
        await this.firebaseService.isLoggedIn().then(async user => {
            if (user) {
                this.router.navigate(['']);
            } else {
                await this.getLocalizationFileData();
            }
            this.loading = false;
        });
    }

    login() {
        this.firebaseService.googleLogin().then(() => {
            this.firebaseService.isLoggedIn().then(user => {
                if (user) {
                    this.setCookie(this.CookieNames.loggedUser, user.uid);
                    this.router.navigate(['']);
                }
            });
        });
    }
}
