import {Component, HostListener} from '@angular/core';
import {AppComponentBase} from "./common/AppComponentBase";
import {FirebaseService} from "../services/firebase.service";
import {Epub, EpubDto} from "../interfaces/models";
import {from, Observable} from "rxjs";
import {HttpClient} from "@angular/common/http";
import * as JSZip from 'jszip';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent {
    title = 'MaterialReader';

    constructor(
    ) {
    }
}
