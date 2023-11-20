import {Component, HostListener, OnInit} from '@angular/core';
import {AppComponentBase} from "../common/AppComponentBase";
import {Epub, EpubDto, Page} from "../../interfaces/models";
import {FirebaseService} from "../../services/firebase.service";
import {from, Observable} from "rxjs";
import {Router} from "@angular/router";
import {HttpClient} from "@angular/common/http";
import * as JSZip from "jszip";
import {Title} from "@angular/platform-browser";

@Component({
    selector: 'app-reader',
    templateUrl: './reader.component.html',
    styleUrls: ['./reader.component.css'],
    providers: [FirebaseService, HttpClient]
})
export class ReaderComponent extends AppComponentBase implements OnInit {
    book: EpubDto = new EpubDto();
    loading = false;
    epubData: any;
    pages: Page[] = [];
    imagesInFile: any[] = [];
    maxNodesPerPage = 15;
    currentNodeCount = 0;
    currentPage: Page = {
        file: '',
        content: []
    }
    currentFile = '';

    constructor(
        private firebaseService: FirebaseService,
        private router: Router,
        private http: HttpClient,
        private titleService: Title
    ) {
        super();
    }

    ngOnInit() {
        this.loading = true;
        const id = window.location.pathname.split('/')[2];

        from(this.firebaseService.GetById(id)).subscribe(async (book) => {
            this.book = book as EpubDto;
            this.titleService.setTitle(this.book.title);
            this.book.lastRead = new Date();

            this.epubData = await this.downloadEpub(this.book.url);
            await this.DynamicParser(this.epubData);
            this.updateBook();
            this.loading = false;
        });
    }
    async downloadEpub(epubUrl: string): Promise<Observable<ArrayBuffer>> {
        return this.http.get(epubUrl, {responseType: 'arraybuffer'});
    }
    async DynamicParser(epubData: Observable<ArrayBuffer>): Promise<void> {
        // get Arraybuffer from Observable
        if (!epubData) {
            return;
        }
        const epubDataArrayBuffer = await epubData.toPromise();
        if (!epubDataArrayBuffer) {
            return;
        }
        await this.ParsePages(this.book.files, epubDataArrayBuffer);
        await this.ParseImages(this.book.images, epubDataArrayBuffer);
    }
    async ParsePages(pageLocationOrder: string[], epubDataArrayBuffer: ArrayBuffer) {
        const zip = new JSZip();
        const epubData = await zip.loadAsync(epubDataArrayBuffer);
        let index = 0;
        while (index < pageLocationOrder.length - 1) {
            const pageFile = await epubData.file(pageLocationOrder[index])!.async('string');
            const parser = new DOMParser();
            const pageXmlDoc = parser.parseFromString(pageFile, 'application/xml');

            if (this.currentFile !== pageLocationOrder[index]) {
                this.pages.push(this.currentPage);
                // @ts-ignore
                this.currentFile = pageLocationOrder[index];
                this.currentPage = { file: this.currentFile, content: [] };
                this.currentNodeCount = 0;
            }
            this.currentPage.file = pageLocationOrder[index];
            await this.ParsePage(pageLocationOrder[index], pageXmlDoc);
            index++;
        }
    }
    async ParsePage(file: string, pageXmlDoc: Document) {
        const bodyElement = pageXmlDoc.querySelector('body');

        if (bodyElement) {
            if (bodyElement.children.length > 0) {
                this.CheckChildrenNodes(bodyElement.children);
            } else {
                console.error('Body element has no children:', bodyElement);
            }
        }
    }
    CheckChildrenNodes(children: any) {
        for (let i = 0; i < children.length; i++) {
            switch (children[i].tagName.toLowerCase()) {
                case 'img':
                    const elementContent = children[i].getAttribute('src');

                    if (this.currentNodeCount + 1 <= this.maxNodesPerPage) {
                        this.currentPage.content.push({
                            type: 'image',
                            value: elementContent.split('/')[elementContent.split('/').length - 1]
                        });
                        this.currentNodeCount++;
                    } else {
                        this.pages.push(this.currentPage);
                        // @ts-ignore
                        this.currentPage = { file: this.currentFile, content: [{ type: 'image', value: elementContent }] };
                        this.currentNodeCount = 1;
                    }
                    break;
                case 'image':
                    const elementContent2 = children[i].getAttribute('xlink:href');

                    if (this.currentNodeCount + 1 <= this.maxNodesPerPage) {
                        // @ts-ignore
                        this.currentPage.content.push({
                            type: 'image',
                            value: elementContent2.split('/')[elementContent2.split('/').length - 1]
                        });
                        this.currentNodeCount++;
                    } else {
                        this.pages.push(this.currentPage);
                        // @ts-ignore
                        this.currentPage = { file: this.currentFile, content: [{ type: 'image', value: elementContent2 }] };
                        this.currentNodeCount = 1;
                    }
                    break;
                case 'p':
                    const elementContent3 = children[i].textContent;
                    if (this.currentNodeCount + 1 <= this.maxNodesPerPage) {
                        // @ts-ignore
                        this.currentPage.content.push({
                            type: 'text',
                            value: elementContent3
                        });
                        this.currentNodeCount++;
                    } else {
                        this.pages.push(this.currentPage);
                        // @ts-ignore
                        this.currentPage = {
                            file: this.currentFile,
                            content: [{type: 'text', value: elementContent3}]
                        };
                        this.currentNodeCount = 1;
                    }
                    break;
                /*case 'i':
                    const elementContentI = children[i].textContent;
                    if (this.currentNodeCount + 1 <= this.maxNodesPerPage) {
                        // @ts-ignore
                        this.currentPage.content.push({
                            type: 'italic',
                            value: elementContentI
                        });
                        this.currentNodeCount++;
                    } else {
                        this.pages.push(this.currentPage);
                        // @ts-ignore
                        this.currentPage = { file: this.currentFile, content: [{ type: 'italic', value: elementContentI }] };
                        this.currentNodeCount = 1;
                    }
                    break;
                case 'b':
                    const elementContentB = children[i].textContent;
                    if (this.currentNodeCount + 1 <= this.maxNodesPerPage) {
                        // @ts-ignore
                        this.currentPage.content.push({
                            type: 'bold',
                            value: elementContentB
                        });
                        this.currentNodeCount++;
                    } else {
                        this.pages.push(this.currentPage);
                        // @ts-ignore
                        this.currentPage = { file: this.currentFile, content: [{ type: 'bold', value: elementContentB }] };
                        this.currentNodeCount = 1;
                    }
                    break;*/
                case 'h1':
                    const elementContent4 = children[i].textContent;

                    if (this.currentNodeCount + 1 <= this.maxNodesPerPage) {
                        // @ts-ignore
                        this.currentPage.content.push({
                            type: 'heading1',
                            value: elementContent4
                        });
                        this.currentNodeCount++;
                    } else {
                        this.pages.push(this.currentPage);
                        // @ts-ignore
                        this.currentPage = { file: this.currentFile, content: [{ type: 'heading1', value: elementContent4 }] };
                        this.currentNodeCount = 1;
                    }
                    break;
                case 'h2':
                    const elementContent5 = children[i].textContent;

                    if (this.currentNodeCount + 1 <= this.maxNodesPerPage) {
                        // @ts-ignore
                        this.currentPage.content.push({
                            type: 'heading2',
                            value: elementContent5
                        });
                        this.currentNodeCount++;
                    } else {
                        this.pages.push(this.currentPage);
                        // @ts-ignore
                        this.currentPage = { file: this.currentFile, content: [{ type: 'heading2', value: elementContent5 }] };
                        this.currentNodeCount = 1;
                    }
                    break;
                case 'h3':
                    const elementContent6 = children[i].textContent;

                    if (this.currentNodeCount + 1 <= this.maxNodesPerPage) {
                        // @ts-ignore
                        this.currentPage.content.push({
                            type: 'heading2',
                            value: elementContent6
                        });
                        this.currentNodeCount++;
                    } else {
                        this.pages.push(this.currentPage);
                        // @ts-ignore
                        this.currentPage = { file: this.currentFile, content: [{ type: 'heading2', value: elementContent6 }] };
                        this.currentNodeCount = 1;
                    }
                    break;
            }
            if (children[i].children.length > 0) {
                this.CheckChildrenNodes(children[i].children);
            }
        }
    }
    async ParseImages(imageLocationOrder: any[], epubDataArrayBuffer: ArrayBuffer) {
        const zip = new JSZip();
        for (const image of imageLocationOrder) {
            // make Blob from ArrayBuffer
            const imageFile = await zip.loadAsync(epubDataArrayBuffer).then((epub) => {
                return epub.file(image.href)!.async('arraybuffer');
            });
            const imageBlob = new Blob([imageFile], {type: image.mediaType});
            const url = URL.createObjectURL(imageBlob);
            this.imagesInFile.push({
                name: image,
                fileUrl: url
            });
        }
    }

    getImageByName(name: string): string {
        let finalName = name.split('/')[name.split('/').length - 1];
        return this.imagesInFile.find(x => x.name.href.split('/')[x.name.href.split('/').length - 1] === finalName)!.fileUrl;
    }

    // Listen for keydown events globally on the document
    @HostListener('document:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        switch (event.key) {
            case 'ArrowLeft':
                this.prevPage();
                break;
            case 'ArrowRight':
                this.nextPage();
                break;
        }
    }

    nextPage(): void {
        if (this.book.currentPage! <= this.pages!.length - 1) {
            this.book.currentPage! = this.book.currentPage! + 1;
        }
        this.book.lastRead = new Date();
        this.getPercentageRead(this.book);
        this.updateBook();
        // scroll to top of page
        window.scrollTo(0, 0);
    }

    prevPage(): void {
        if (this.book.currentPage! > 0) {
            this.book.currentPage = this.book.currentPage! - 1;
        }
        this.book.lastRead = new Date();
        this.getPercentageRead(this.book);
        this.updateBook();
        window.scrollTo(0, 0);
    }

    updateBook(): void {
        this.firebaseService.Update(this.book);
    }

    GoToHome(): void {
        this.router.navigate(['/']);
    }

    getPercentageRead(book: Epub) {
        let percentage = 0;
        percentage = (book.currentPage / this.pages.length) * 100;
        this.book.percentageRead = Math.round(percentage);
    }
}
