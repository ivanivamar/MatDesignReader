import {Pipe, PipeTransform} from '@angular/core';
import {LocalizationService} from "../services/localization.service";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";

@Pipe({
    name: 'localize',
    pure: false,
})
export class LocalizePipe implements PipeTransform {
    constructor(private localizationService: LocalizationService) {
    }

    transform(key: string): Observable<string> {
        return this.l(key);
    }

    l(key: string): Observable<string> {
        return this.localizationService.localizationData$.pipe(
            map((data) => {
                if (data && data.hasOwnProperty(key)) {
                    return data[key];
                } else {
                    return key; // Return the original key if translation not found
                }
            })
        );
    }
}
