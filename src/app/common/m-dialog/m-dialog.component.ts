import {Component, ElementRef, EventEmitter, Input, Output} from '@angular/core';
// detect keyboard event
import { HostListener } from '@angular/core';

@Component({
    selector: 'm-dialog',
    templateUrl: './m-dialog.component.html',
    styleUrls: ['./m-dialog.component.css'],
})
export class MDialogComponent {
    @Input() header: string = '';
    @Input() visible: boolean = false;
    @Input() width: string = 'auto';
    @Input() height: string = 'auto';
    @Input() closeOnEscape: boolean = true;
    @Input() dismissibleMask: boolean = true;
    @Input() showMask: boolean = true;
    @Input() panel = false;
    @Output() visibleChange: EventEmitter<boolean> = new EventEmitter<boolean>();

    constructor(private _eref: ElementRef) {
    }

    closeDialog() {
        this.visible = false;
        this.visibleChange.emit(this.visible);
    }

    onResizeEnd(event: any) {
        this.width = event.width;
        this.height = event.height;
    }

    // Close dialog on escape key
    @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(event: KeyboardEvent) {
        if (this.closeOnEscape) {
            this.closeDialog();
        }
    }
}
