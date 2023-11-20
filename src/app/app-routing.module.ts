import {RouterModule, Routes} from "@angular/router";
import {NgModule} from "@angular/core";
import {BookDashboardComponent} from "./book-dashboard/book-dashboard.component";
import {ReaderComponent} from "./reader/reader.component";

const routes: Routes = [
    {
        path: '',
        component: BookDashboardComponent,
        pathMatch: 'full',
    },
    {
        path: 'reader/:id',
        component: ReaderComponent,
        pathMatch: 'full',
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule { }
