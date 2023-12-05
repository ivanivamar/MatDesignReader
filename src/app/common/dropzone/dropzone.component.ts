import {Component, HostListener} from '@angular/core';

@Component({
    selector: 'app-dropzone',
    templateUrl: './dropzone.component.html',
    styleUrls: ['./dropzone.component.css']
})
export class DropzoneComponent {
    fileOver = false;

    @HostListener('dragover', ['$event']) onDragOver(evt: any) {
        evt.preventDefault();
        evt.stopPropagation();
        this.fileOver = true;
    }

    @HostListener('dragleave', ['$event']) public onDragLeave(evt: any) {
        evt.preventDefault();
        evt.stopPropagation();
    }

    @HostListener('drop', ['$event']) public ondrop(evt: any) {
        evt.preventDefault();
        evt.stopPropagation();
        this.fileOver = false;
        const files = evt.dataTransfer.files;
        if (files.length > 0) {
            console.log(files);
        }
    }

}
