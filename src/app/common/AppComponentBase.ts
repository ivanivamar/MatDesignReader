import { User } from "firebase/auth";
import {LocalizationService} from "./services/localization.service";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {Injector} from "@angular/core";

export class AppComponentBase {
    loggedUser: User | null = null;
    language: string = navigator.language;
    localizationData: any = null;
    localizationService: LocalizationService;

    constructor(
        injector: Injector
    ) {
        this.localizationService = injector.get(LocalizationService);
    }

    IsNullOrEmpty = (value: string) => {
        return value === undefined || value === null || value.trim() === '';
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

    async getLocalizationFileData() {
        this.localizationService.loadLocalizationData().subscribe(() => {
            // Localization data is now loaded
            const value = this.localizationService.getLocalizationData()['YourLibrary'];
            console.log(value);
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
}
