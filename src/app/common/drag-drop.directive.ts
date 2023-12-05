import {Directive, HostBinding} from '@angular/core';

@Directive({
    selector: '[DragDrop]'
})
export class DragDropDirective {
    @HostBinding('class.fileover') fileOver: boolean | undefined;

    constructor() {
    }

}
