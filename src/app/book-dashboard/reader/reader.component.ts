import {Component, HostListener, Injector, OnInit} from '@angular/core';
import {AppComponentBase} from "../../common/AppComponentBase";
import {EpubDto, Page, Toc} from "../../common/interfaces/models";
import {FirebaseService} from "../../common/services/firebase.service";
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
    loading = true;
    loadingProgress = 0;
    loadingMessage = '';
    epubData: any;
    pages: Page[] = [];
    imagesInFile: any[] = [];
    maxNodesPerPage = 12;
    currentNodeCount = 0;
    currentPage: Page = {
        file: '',
        content: []
    }
    currentFile = '';
    showToc = false;
    word = '';
    definition: Dictionary = {} as Dictionary;
    position = {
        top: 0,
        left: 0
    }
    showDefinition = false;
    isFullScreen = false;

    searchTerm = '';
    searchResults: any[] = [];
    showSearchResults = false;

    constructor(
        injector: Injector,
        private firebaseService: FirebaseService,
        private router: Router,
        private http: HttpClient,
        private titleService: Title
    ) {
        super(injector);
    }

    ngOnInit() {
        this.firebaseService.isLoggedIn().then(user => {
            if (!user) {
                this.router.navigate(['login']);
            } else {
                this.setCookie(this.CookieNames.loggedUser, user.uid);
                this.loggedUser = user;
                const id = window.location.pathname.split('/')[2];

                from(this.firebaseService.GetById(id, this.loggedUser?.uid)).subscribe(async (book) => {
                    this.book = book as EpubDto;
                    console.log("BOOK:", this.book);
                    this.titleService.setTitle(this.book.title);
                    this.book.lastRead = new Date();

                    this.epubData = await this.downloadEpub(this.book.url);
                    await this.DynamicParser(this.epubData);
                    this.updateBook();
                    await this.getLocalizationFileData();
                    this.loading = false;
                });
            }
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
        this.book.totalCurrentPage = this.pages.length;
        await this.ParseImages(this.book.images, epubDataArrayBuffer);
    }
    async ParsePages(pageLocationOrder: string[], epubDataArrayBuffer: ArrayBuffer) {
        const zip = new JSZip();
        const epubData = await zip.loadAsync(epubDataArrayBuffer);
        let index = 0;
        this.loadingMessage = 'Parsing pages...';
        while (index < pageLocationOrder.length - 1) {
            const pageFile = await epubData.file(pageLocationOrder[index])!.async('string');
            const parser = new DOMParser();
            const pageXmlDoc = parser.parseFromString(pageFile, 'application/xml');

            if (this.currentFile !== pageLocationOrder[index]) {
                if (this.currentFile !== '') {
                    this.pages.push(this.currentPage);
                }
                // @ts-ignore
                this.currentFile = pageLocationOrder[index];
                this.currentPage = { file: this.currentFile, content: [] };
                this.currentNodeCount = 0;
            }
            this.currentPage.file = pageLocationOrder[index];
            await this.ParsePage(pageLocationOrder[index], pageXmlDoc);
            index++;
            // add more percentage to loading bar based on how many pages have been parsed
            this.loadingProgress = Math.round((index / pageLocationOrder.length) * 100);
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
                    const elementContent3 = children[i].innerHTML;
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
                case 'blockquote':
                    const elementContentBQ = children[i].textContent;
                    if (this.currentNodeCount + 1 <= this.maxNodesPerPage) {
                        // @ts-ignore
                        this.currentPage.content.push({
                            type: 'bq',
                            value: elementContentBQ
                        });
                        this.currentNodeCount++;
                    } else {
                        this.pages.push(this.currentPage);
                        // @ts-ignore
                        this.currentPage = {
                            file: this.currentFile,
                            content: [{type: 'text', value: elementContentBQ}]
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
        this.loadingMessage = 'Parsing images...';
        this.loadingProgress = 0;
        const zip = new JSZip();
        let index = 0;
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
            index++;
            // add more percentage to loading bar based on how many images have been parsed
            this.loadingProgress = Math.round((index / imageLocationOrder.length) * 100);
        }
    }

    getImageByName(name: string): string {
        let finalName = name.split('/').pop();
        return this.imagesInFile.find(x => x.name.href.split('/').pop() === finalName)!.fileUrl;
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
            case 'f':
                this.fullScreen();
                break;
        }
    }

    prevPage(): void {
        if (this.book.currentPage > 0) {
            this.book.currentPage--;
        }
        this.book.lastRead = new Date();
        this.setChapter();
        this.getPercentageRead();
        this.updateBook();
        window.scrollTo(0, 0);
    }
    nextPage(): void {
        if (this.book.currentPage !== this.pages.length - 1) {
            this.book.currentPage++;
        }
        this.book.lastRead = new Date();
        this.setChapter();
        this.getPercentageRead();
        this.updateBook();
        // scroll to top of page
        window.scrollTo(0, 0);
    }
    goToPage(page: number): void {
        this.book.currentPage = page;
        this.book.lastRead = new Date();
        this.setChapter();
        this.getPercentageRead();
        this.updateBook();
        // scroll to top of page
        window.scrollTo(0, 0);

        // if mobile, hide menu
        if (window.innerWidth < 768) {
            this.showSearchResults = false;
        }
    }

    toggleTocMenu() {
        this.showToc = !this.showToc;
    }

    getSearchResults(): void {
        this.searchResults = [];
        if (this.searchTerm.length > 0) {
            for (let i = 0; i < this.pages.length; i++) {
                for (let j = 0; j < this.pages[i].content.length; j++) {
                    if (this.pages[i].content[j].type === 'text') {
                        if (this.pages[i].content[j].value.toLowerCase().includes(this.searchTerm.toLowerCase())) {
                            this.searchResults.push({
                                page: i,
                                chapter: this.getChapterOfPageFromToc(i),
                                content: this.pages[i].content[j].value
                            });
                        }
                    }
                }
            }
        }
    }

    getChapterOfPageFromToc(page: number): string {
        const pageFile = this.pages[page].file.split('/').pop();
        let chapter = '';
        this.book.toc.forEach((x) => {
            if (x.subItems.length > 0) {
                x.subItems.forEach((y) => {
                    if (y.file.split('/').pop() === pageFile) {
                        chapter = x.title;
                    }
                });
            }
            if (x.file.split('/').pop() === pageFile) {
                chapter = x.title;
            }
        });
        return chapter;
    }

    setChapter(): void {
        const page = this.pages[this.book.currentPage].file.split('/').pop();
        // get chapter
        let q: Toc | null = null;
        this.book.toc.forEach((x) => {
            if (x.subItems.length > 0) {
                x.subItems.forEach((y) => {
                    if (y.file.split('/').pop() === page && q == null) {
                        q = y;
                    }
                });
            }
            if (x.file.split('/').pop() === page && q == null) {
                q = x;
            }
        });
        if (q != null) {
            this.book.currentChapter = q;
        }
    }

    navigateToChapter(chapter: Toc): void {
        // find in this.pages the page that matches the chapter.file
        const page = this.pages.find(x => x.file.split('/').pop() === chapter.file.split('/').pop());
        // set this.book.currentPage to the index of the page
        this.book.currentPage = this.pages.indexOf(page!);
        this.getPercentageRead();
        this.setChapter();
        this.book.lastRead = new Date();
    }

    getPagesUntilNextChapter(): number {
        const startIndex = this.book.currentPage!;
        let pageCount = 0;
        let nextChapterFile = '';
        for (let i = 0; i < this.book.toc.length; i++) {
            if (this.book.toc[i].subItems.length > 0) {
                for (let j = 0; j < this.book.toc[i].subItems.length; j++) {
                    if (this.book.toc[i].subItems[j].file.split('/').pop() === this.book.currentChapter.file.split('/').pop()) {
                        if (j + 1 < this.book.toc[i].subItems.length) {
                            // @ts-ignore
                            nextChapterFile = this.book.toc[i].subItems[j + 1].file.split('/').pop();
                        } else {
                            // @ts-ignore
                            nextChapterFile = this.book.toc[i + 1].file.split('/').pop();
                        }
                        break;
                    }
                }
            }
            if (this.book.toc[i].file.split('/').pop() === this.book.currentChapter.file.split('/').pop()) {
                if (i + 1 < this.book.toc.length) {
                    // @ts-ignore
                    nextChapterFile = this.book.toc[i + 1].file.split('/').pop();
                } else {
                    // @ts-ignore
                    nextChapterFile = this.book.toc[i].file.split('/').pop();
                }
                break;
            }
        }
        for (let i = startIndex; i < this.pages.length; i++) {
            if (this.pages[i].file.split('/').pop() !== nextChapterFile) {
                pageCount++;
            } else {
                break;
            }
        }

        return pageCount;
    }

    updateBook(): void {
        this.firebaseService.Update(this.book, this.loggedUser?.uid);
    }

    GoToHome(): void {
        this.router.navigate(['/']);
    }

    getPercentageRead() {
        console.log('Current page:', this.book.currentPage === this.pages.length);
        console.log('Total pages:', this.pages.length);
        this.book.percentageRead = (this.book.currentPage / this.pages.length) * 100;
    }

    onMouseUp(event: MouseEvent): void {
        let selection = window.getSelection();
        if (selection) {
            this.word = selection.toString();
            if (this.word.length > 0) {
                this.getDefinition(this.word);
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                this.position = {
                    top: (rect.top + window.scrollY) + 20,
                    left: rect.left + window.scrollX
                };
            }
        }
    }

    getDefinition(word: string): void {
        this.firebaseService.getDefinition(word, this.book.language).subscribe(
            (result: any) => {
                // Adjust the response handling based on the structure of the API
                if (Array.isArray(result) && result.length > 0) {
                    // Assuming the first entry contains the definition
                    this.definition = result[0]
                    this.showDefinition = true;
                } else {
                    this.definition = {} as Dictionary;
                }
            },
            error => {
                console.error('Error fetching definition:', error);
                this.definition = {} as Dictionary;
            }
        );
    }

    fullScreen(): void {
        if (this.isFullScreen) {
            this.isFullScreen = false;
            document.exitFullscreen();
        } else {
            this.isFullScreen = true;
            document.documentElement.requestFullscreen();
        }
    }
}
export interface Dictionary {
    word:      string;
    phonetic:  string;
    phonetics: Phonetic[];
    origin:    string;
    meanings:  Meaning[];
}

export interface Meaning {
    partOfSpeech: string;
    definitions:  Definition[];
}

export interface Definition {
    definition: string;
    example:    string;
    synonyms:   any[];
    antonyms:   any[];
}

export interface Phonetic {
    text:   string;
    audio?: string;
}
