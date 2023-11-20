import {Component, EventEmitter, Input, Output} from '@angular/core';
import {AppComponentBase} from "../AppComponentBase";

@Component({
    selector: 't-button',
    templateUrl: './button.component.html',
    styleUrls: ['./button.component.css']
})
export class ButtonComponent extends AppComponentBase {
    @Input() text: string = '';
    @Input() icon: string = '';
    @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

    constructor() {
        super();
    }

    onClicked() {
        this.onClick.emit();
    }
}
