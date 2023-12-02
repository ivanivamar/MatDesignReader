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

    constructor(
        injector: Injector,
        private firebaseService: FirebaseService,
        private router: Router,
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.firebaseService.isLoggedIn().then(user => {
            if (user) {
                this.router.navigate(['']);
            } else {
                this.firebaseService.googleLogin().then(() => {
                    this.firebaseService.isLoggedIn().then(user => {
                        if (user) {
                            this.loggedUser = user;
                            console.log("USER:", this.loggedUser);
                            this.router.navigate(['']);
                        }
                    });
                });
            }
        });
    }
}
