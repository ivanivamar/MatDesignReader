import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {FirebaseService} from "../services/firebase.service";
import {RouterOutlet} from "@angular/router";
import { ButtonComponent } from './common/button/button.component';
import {FormsModule} from "@angular/forms";
import {HttpClient, HttpClientModule} from "@angular/common/http";
import { BookDashboardComponent } from './book-dashboard/book-dashboard.component';
import { ReaderComponent } from './reader/reader.component';
import {AppRoutingModule} from "./app-routing.module";

@NgModule({
    declarations: [
        AppComponent,
        ButtonComponent,
        BookDashboardComponent,
        ReaderComponent
    ],
    imports: [
        BrowserModule,
        RouterOutlet,
        FormsModule,
        HttpClientModule,
        AppRoutingModule
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
