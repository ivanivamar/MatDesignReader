import {Component, ElementRef, Input} from '@angular/core';

@Component({
    selector: 'm-menu',
    templateUrl: './m-menu.component.html',
    styleUrls: ['./m-menu.component.sass'],
    host: {
        '(document:click)': 'onClick($event)',
    },
})
export class MMenuComponent {
    @Input() options: IMenuOption[] = [];
    expanded: boolean = false;

    constructor(private _eref: ElementRef) { }

    onClick(event: Event) {
        if (!this._eref.nativeElement.contains(event.target)) {
            this.expanded = false;
        }
    }
}

export interface IMenuOption {
    label: string;
    icon?: string;
    action: () => void;
    disabled?: boolean;
}
