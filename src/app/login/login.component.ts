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
    showRegister = false;
    confirmPassword = '';
    showRegisterStep = false;

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
            }
            await this.getLocalizationFileData();
            this.loading = false;
        });
    }
    checkLogin(): boolean {
        if (this.user.email === undefined || this.user.email === null || this.user.email.trim() === '') {
            return false;
        }
        if (this.user.password === undefined || this.user.password === null || this.user.password.trim() === '') {
            return false;
        }
        return true;
    }
    login() {
        this.firebaseService.login(this.user.email, this.user.password).then(() => {
            this.router.navigate(['']);
        });
    }

    checkRegister(): boolean {
        if (this.user.email === undefined || this.user.email === null || this.user.email.trim() === '') {
            return false;
        }
        if (this.user.password === undefined || this.user.password === null || this.user.password.trim() === '') {
            return false;
        }
        if (this.confirmPassword === undefined || this.confirmPassword === null || this.confirmPassword.trim() === '') {
            return false;
        }
        if (this.user.password !== this.confirmPassword) {
            return false;
        }
        return true;
    }
    register() {
        this.firebaseService.createUser(this.user.email, this.user.password).then((result: any) => {
            this.showRegisterStep = true;
            this.user = result;
        });
    }

    uploadProfilePicture(event: any) {
        // check if is image:
        if (!event.target.files[0].type.startsWith('image')) {
            return;
        }

        this.firebaseService.uploadEpubToStorage(event.target.files[0], this.user.id + '/profilePicture').then((url) => {
            this.user.profilePicture = url;
        });
    }

    saveSettings() {
        this.firebaseService.updateUser(this.user).then(() => {
            this.router.navigate(['']);
        });
    }
}
