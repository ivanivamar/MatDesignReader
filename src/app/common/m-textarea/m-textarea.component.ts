import {Component, ElementRef, EventEmitter, Injector, Input, Output, ViewChild} from '@angular/core';
import {AppComponentBase} from "../AppComponentBase";

@Component({
  selector: 'm-textarea',
  templateUrl: './m-textarea.component.html',
  styleUrls: ['./m-textarea.component.css']
})
export class MTextareaComponent extends AppComponentBase {
    @ViewChild('inputRef') inputRef!: ElementRef;

    @Input() value: any = null;
    @Input() placeholder: string = '';
    @Input() label: string = '';
    @Input() disabled: boolean = false;
    @Input() icon: string = '';
    @Input() showClear: boolean = false;
    @Input() helperText: string = '';
    @Input() showCounter: boolean = false;
    @Input() maxLength: number = 0;
    @Input() required: boolean = false;
    @Input() name: string = '';
    @Input() showPassword: boolean = false;
    @Input() autofocus: boolean = false;

    @Output() valueChange = new EventEmitter();
    @Output() onClear = new EventEmitter();

    error: boolean = false;
    isFocused: boolean = false;
    showingPassword: boolean = false;

    constructor(
        injector: Injector
    ) {
        super(injector);
    }

    clear() {
        this.value = '';
        this.valueChange.emit(this.value);
        this.onClear.emit();
    }

    onFocus() {
        this.isFocused = true;
    }

    onBlur() {
        this.isFocused = false;
    }

    isFocus(): boolean {
        let hasValue = false;

        if (this.value !== null && this.value !== undefined) {
            hasValue = this.value.toString().trim().length > 0;
        }

        return this.isFocused || hasValue;
    }
}
