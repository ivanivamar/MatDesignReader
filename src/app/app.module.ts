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
import { DropzoneComponent } from './common/dropzone/dropzone.component';
import { DragDropDirective } from './common/drag-drop.directive';
import { BookDetailComponent } from './book-dashboard/book-detail/book-detail.component';

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
        LocalizePipe,
        DropzoneComponent,
        DragDropDirective,
        BookDetailComponent
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
