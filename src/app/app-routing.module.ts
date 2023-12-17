import {RouterModule, Routes} from "@angular/router";
import {NgModule} from "@angular/core";
import {BookDashboardComponent} from "./book-dashboard/book-dashboard.component";
import {ReaderComponent} from "./book-dashboard/reader/reader.component";
import {LoginComponent} from "./login/login.component";
import {ShelvesComponent} from "./shelves/shelves.component";
import {BookDetailComponent} from "./book-dashboard/book-detail/book-detail.component";

const routes: Routes = [
    {
        path: '',
        redirectTo: 'books',
        pathMatch: 'full',
    },
    {
        path: 'books',
        component: BookDashboardComponent,
        pathMatch: 'full',
    },
    {
        path: 'books/:id',
        component: BookDetailComponent,
        pathMatch: 'full',
    },
    {
        path: 'shelves',
        component: ShelvesComponent,
        pathMatch: 'full',
    },
    {
        path: 'reader/:id',
        component: ReaderComponent,
        pathMatch: 'full',
    },
    {
        path: 'login',
        component: LoginComponent,
        pathMatch: 'full',
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule { }
