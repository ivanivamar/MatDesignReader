import {Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import { IDropdownOption } from '../interfaces/models';

@Component({
    host: {
        '(document:click)': 'onClick($event)',
    },
    selector: 'm-dropdown',
    templateUrl: './m-dropdown.component.html',
    styleUrls: ['./m-dropdown.component.sass']
})
export class MDropdownComponent implements OnInit {
	@Input() small: boolean = false;
    @Input() options: any[] = [];
    @Input() optionLabel: string = 'label';
    @Input() optionValue: string = 'value';
    @Input() optionIcon: string = 'icon';
    @Input() placeholder: string = 'Select an Option';
    @Input() value: any = null;
    @Input() disabled: boolean = false;
    @Input() icon: string = '';
    @Input() showClear: boolean = false;
    @Input() returnValue: boolean = false;
    @Input() multiple: boolean = false;

    @Output() valueChange = new EventEmitter();

    expanded: boolean = false;
    ngModelLabel: string = '';

    constructor(private _eref: ElementRef) {
    }

    ngOnInit() {
        if ((!this.multiple && this.value !== null) || (this.multiple && this.value.length !== 0)) {
            if (this.multiple) {
                this.options.forEach((item: any) => {
                    this.value.forEach((value: any) => {
                        if (item[this.optionValue] === value[this.optionValue]) {
                            item.selected = true;
                        }
                    });
                });
                this.ngModelLabel = this.options.filter((item: any) => item.selected).map((item: any) => item[this.optionLabel]).join(', ');
            } else {
                this.options.forEach((item: any) => {
                    item.selected = item[this.optionValue] === this.value;
                });
                this.ngModelLabel = this.options.filter((item: any) => item.selected).map((item: any) => item[this.optionLabel]).join(', ');
            }
        } else {
            console.log(this.value.length !== 0);
            this.options.forEach((item: any) => {
                item.selected = false;
            });
            this.ngModelLabel = this.placeholder;
        }
    }

    onClick(event: Event) {
        if (!this._eref.nativeElement.contains(event.target)) {
            this.expanded = false;
        } else {
            this.expanded = true;
        }
    }

    selectItem(option: any) {
        this.value = option[this.optionValue];
        this.ngModelLabel = option[this.optionLabel];

        this.options.forEach((item: any) => {
            if (this.multiple) {
                if (item.value === option[this.optionValue]) {
                    item.selected = !item.selected;
                }
            } else {
                item.selected = false;
            }
        });
        if (this.multiple) {
            option.selected = !option.selected;
        }
        console.log(option);

        if (this.multiple) {
            this.value = this.options.filter((item: any) => item.selected).map((item: any) => item);
            this.ngModelLabel = this.options.filter((item: any) => item.selected).map((item: any) => item[this.optionLabel]).join(', ');
            let arrayOfOptionLabel = this.options.filter((item: any) => item.selected).map((item: any) => item[this.optionLabel]);
            this.valueChange.emit(this.value);
        } else {
			this.valueChange.emit(this.value);
		}

        this.expanded = this.multiple;
    }

    clear(event: Event) {
        event.stopPropagation();
        this.value = null;
        this.ngModelLabel = '';
        this.options.forEach((item: IDropdownOption) => {
            item.selected = false;
        });
    }
}
