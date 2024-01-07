import {Injectable, Injector} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {AppComponentBase} from "../AppComponentBase";

@Injectable({
    providedIn: 'root',
})
export class LocalizationService {
    private localizationDataSubject = new BehaviorSubject<any>(null);
    localizationData$ = this.localizationDataSubject.asObservable();

    constructor(
        private http: HttpClient,
    ) {
    }

    loadLocalizationData(): Observable<any> {
        const localizationDataUrl = `/assets/localizations/es.json`;

        return this.http.get(localizationDataUrl, { responseType: 'text' }).pipe(
            map((dataString) => {
                // Parse the JSON string into an object
                const dataObject = JSON.parse(dataString);
                return dataObject;
            }),
            tap((data) => this.localizationDataSubject.next(data)),
            catchError((error) => {
                console.error('Error loading localization data', error);
                return [];
            })
        );
    }

    getLocalizationData(): any {
        return this.localizationDataSubject.value;
    }
}
