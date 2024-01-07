import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {FirebaseService} from "./common/services/firebase.service";
import {RouterOutlet} from "@angular/router";
import {FormsModule} from "@angular/forms";
import {HttpClient, HttpClientModule} from "@angular/common/http";
import { BookDashboardComponent } from './book-dashboard/book-dashboard.component';
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
import {ReaderComponent} from "./book-dashboard/reader/reader.component";
import {NgCircleProgressModule} from "ng-circle-progress";
import { MMenuComponent } from './common/m-menu/m-menu.component';
import {LongPressDirective} from "./common/long-press.directive";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatSliderModule} from "@angular/material/slider";
import {DragDropModule} from "@angular/cdk/drag-drop";
import {MatRippleModule} from '@angular/material/core';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';

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
        BookDetailComponent,
        MMenuComponent,
        LongPressDirective,
    ],
    imports: [
        BrowserModule,
        RouterOutlet,
        FormsModule,
        HttpClientModule,
        AppRoutingModule,
        NgCircleProgressModule.forRoot({
            // set defaults here
            radius: 100,
            outerStrokeWidth: 16,
            innerStrokeWidth: 12,
            outerStrokeColor: "#A8C7FA",
            innerStrokeColor: "#2D2F31",
            animation: false,
            responsive: true,
            renderOnClick: false,
            showSubtitle: false,
            unitsFontSize: "64",
            unitsFontWeight: "600",
            titleFontSize: "64",
            titleFontWeight: "600",
            titleColor: "#E3E3E3",
            unitsColor: "#E3E3E3",
        }),
        BrowserAnimationsModule,
        MatSliderModule,
        DragDropModule,
        MatRippleModule,
        MatSlideToggleModule,
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
