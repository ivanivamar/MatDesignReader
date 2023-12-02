import {RouterModule, Routes} from "@angular/router";
import {NgModule} from "@angular/core";
import {BookDashboardComponent} from "./book-dashboard/book-dashboard.component";
import {ReaderComponent} from "./reader/reader.component";
import {LoginComponent} from "./login/login.component";
import {ShelvesComponent} from "./shelves/shelves.component";

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
