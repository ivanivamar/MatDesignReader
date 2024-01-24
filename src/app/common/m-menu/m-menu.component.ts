import {Component, ElementRef, Input, OnInit} from '@angular/core';

@Component({
    selector: 'm-menu',
    templateUrl: './m-menu.component.html',
    styleUrls: ['./m-menu.component.sass'],
    host: {
        '(document:click)': 'onClick($event)',
    },
})
export class MMenuComponent implements OnInit {
    @Input() options: IMenuOption[] = [];
    expanded: boolean = false;
    positionY: string = 'bottom';
    positionX: string = 'left';

    constructor(private _eref: ElementRef) { }

    ngOnInit() {
        // detect if its on top or bottom of the screen
        const rect = this._eref.nativeElement.getBoundingClientRect();
        if (rect.top > window.innerHeight / 2) {
            this.positionY = 'top';
        } else {
            this.positionY = 'bottom';
        }

        // detect if its on left or right of the screen
        if (rect.left > window.innerWidth / 2) {
            this.positionX = 'right';
        } else {
            this.positionX = 'left';
        }
    }

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
