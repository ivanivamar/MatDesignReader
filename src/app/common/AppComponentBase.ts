import { User } from "firebase/auth";
import {LocalizationService} from "./services/localization.service";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {Injector} from "@angular/core";
import {IUser, UserDto} from "./interfaces/models";

export class AppComponentBase {
    language: string = navigator.language;
    localizationData: any = null;
    localizationService: LocalizationService;
    CookieNames = CookieNames;
    loggedUser: User | null = null;
    user: UserDto = new UserDto();

    constructor(
        injector: Injector
    ) {
        this.localizationService = injector.get(LocalizationService);
    }

    IsNullOrEmpty(value: string): boolean {
        return value === undefined || value === null || value.trim() === '';
    }

    Round(value: number, decimals: number = 0): number {
        return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
    }
    Floor(value: number): number {
        return Math.floor(value);
    }

    IdGenerator(): string {
        let id = '';
        // mix of numbers and letters
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < 20; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }

    getDateFromTimestamp(timestamp: any): string {
        let date = new Date(timestamp.seconds * 1000);
        // format dd/mm/yyyy HH:mm
        return date.getDate() + '/' + date.getMonth() + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
    }

    getDateFromTimestampToDate(timestamp: any): Date {
        let date = new Date(timestamp.seconds * 1000);
        // format dd/mm/yyyy HH:mm
        return date;
    }

    async getLocalizationFileData() {
        this.localizationService.loadLocalizationData().subscribe(() => {
            // Localization data is now loaded
            const value = this.localizationService.getLocalizationData()['YourLibrary'];
        });
    }

    l(key: string): string {
        // pass Observable to string
        let value = '';
        this.localizationService.localizationData$.pipe(
            map((data) => {
                if (data && data.hasOwnProperty(key)) {
                    return data[key];
                } else {
                    return key; // Return the original key if translation not found
                }
            })
        ).subscribe((res) => {
            value = res;
        });
        return value;
    }

    toUnderScore(str: string): string {
        return str.toLowerCase();
    }

    setCookie(name: string, value: string, days: number | null = null) {
        let expires = '';
        if (days != null) {
            let date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        } else {
            expires = '; expires=Fri, 31 Dec 9999 23:59:59 GMT';
        }
        document.cookie = name + '=' + (value || '') + expires + '; path=/';
    }

    getCookie(name: string) {
        let nameEQ = name + '=';
        let ca = document.cookie.split(';');
        for (let c of ca) {
            let cookie = c.trim();
            if (cookie.indexOf(nameEQ) == 0) {
                return cookie.substring(nameEQ.length, cookie.length);
            }
        }
        return null;
    }

    eraseCookie(name: string) {
        document.cookie = name + '=; Max-Age=-99999999;';
    }

    getLoggedUser(): User | null {
        // get cookie loggedUser
        let loggedUser = this.getCookie('loggedUser');
        if (loggedUser) {
            return JSON.parse(loggedUser);
        } else {
            return null;
        }
    }
}

export enum CookieNames {
    loggedUser = 'loggedUser',
    language = 'language'
}
