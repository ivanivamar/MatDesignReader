import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {FirebaseService} from "./common/services/firebase.service";
import {RouterOutlet} from "@angular/router";
import {FormsModule} from "@angular/forms";
import {HttpClient, HttpClientModule} from "@angular/common/http";
import { BookDashboardComponent } from './book-dashboard/book-dashboard.component';
import { ReaderComponent } from './reader/reader.component';
import {AppRoutingModule} from "./app-routing.module";
import { LoginComponent } from './login/login.component';
import { ShelvesComponent } from './shelves/shelves.component';
import { MInputComponent } from './common/m-input/m-input.component';
import { MDialogComponent } from './common/m-dialog/m-dialog.component';
import { MDividerComponent } from './common/m-divider/m-divider.component';
import { LocalizePipe } from './common/pipe/localize.pipe';

@NgModule({
    declarations: [
        AppComponent,
        BookDashboardComponent,
        ReaderComponent,
        LoginComponent,
        ShelvesComponent,
        MInputComponent,
        MDialogComponent,
        MDividerComponent,
        LocalizePipe
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
