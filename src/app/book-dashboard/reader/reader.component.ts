import {Component, HostListener, Injector, OnInit} from '@angular/core';
import {AppComponentBase} from "../../common/AppComponentBase";
import {EpubDto, Note, NoteCategory, Page, Toc} from "../../common/interfaces/models";
import {FirebaseService} from "../../common/services/firebase.service";
import {from, Observable} from "rxjs";
import {Router} from "@angular/router";
import {HttpClient} from "@angular/common/http";
import * as JSZip from "jszip";
import {Title} from "@angular/platform-browser";
import {Book} from "epubjs";
import {Rendition} from "epubjs";
import Navigation, {NavItem} from "epubjs/types/navigation";
import Locations from "epubjs/types/locations";

@Component({
    selector: 'app-reader',
    templateUrl: './reader.component.html',
    styleUrls: ['./reader.component.css'],
    providers: [FirebaseService, HttpClient]
})
export class ReaderComponent extends AppComponentBase implements OnInit {
    book: EpubDto = new EpubDto();
    readerBook: Book = new Book();
    // @ts-ignore
    rendition: Rendition;
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
    chapters: Array<NavItem> = [];
    totalCurrentPagesChapter = {
        current: 0,
        total: 0,
        untilEnd: 0
    }

    searchTerm = '';
    searchResults: any[] = [];
    showSearchResults = false;

    showMenusMobile = false;
    showNotes = false;
    edittingNoteId = '';

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
                    const doc = document.documentElement
                    doc.style.setProperty('--doc-height', `${window.innerHeight}px`)
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
        this.loading = false;

        this.readerBook = this.firebaseService.getBook(epubDataArrayBuffer);
        this.storeChapters();
        this.rendition = this.readerBook.renderTo('viewer', {
            flow: 'auto',
            width: '100%',
            height: '100%',
            snap: true
        });
        // style the epub
        this.rendition.themes.default({
            "p": {
                "font-family": "'Google Sans Medium', sans-serif !important",
                "font-size": "18px !important",
                "line-height": "28px !important",
                "color": "#c4c7c5 !important",
                "margin": "12px 0 !important",
                "font-weight": "bold !important"
            },
            "h1": {
                "font-family": "'Google Sans Medium', sans-serif !important",
                "font-size": "32px !important",
                "line-height": "40px !important",
                "color": "#c4c7c5 !important",
                "margin": "0 !important",
                "margin-bottom": "0.5rem !important",
                "font-weight": "700 !important"
            },
            "h2": {
                "font-family": "'Google Sans Medium', sans-serif !important",
                "font-size": "28px !important",
                "line-height": "36px !important",
                "color": "#c4c7c5 !important",
                "margin": "0 !important",
                "margin-bottom": "0.5rem !important",
                "font-weight": "700 !important"
            },
            "h3": {
                "font-family": "'Google Sans Medium', sans-serif !important",
                "font-size": "24px !important",
                "line-height": "32px !important",
                "color": "#c4c7c5 !important",
                "margin": "0 !important",
                "margin-bottom": "0.5rem !important",
                "font-weight": "700 !important"
            },
            "blockquote": {
                "font-family": "'Google Sans Italic', sans-serif !important",
                "font-size": "18px !important",
                "line-height": "28px !important",
                "color": "#c4c7c5 !important",
                "margin": "12px 0 !important"
            },
            "a": {
                "color": "#c4c7c5 !important",
                "text-decoration": "none !important"
            },
            "em": {
                "font-family": "'Google Sans Italic', sans-serif !important",
                "font-size": "18px !important",
                "line-height": "28px !important",
                "color": "#c4c7c5 !important",
                "margin": "12px 0 !important"
            }
        });


        // @ts-ignore
        if (typeof string === this.book.currentPage && this.book.currentPage !== '') {
            await this.rendition.display(this.book.currentPage);
        } else {
            await this.rendition.display();
        }
        // @ts-ignore
        this.totalCurrentPagesChapter.current = this.rendition.currentLocation().start.displayed.page;
        // @ts-ignore
        this.totalCurrentPagesChapter.total = this.rendition.currentLocation().start.displayed.total;
        this.totalCurrentPagesChapter.untilEnd = this.totalCurrentPagesChapter.total - this.totalCurrentPagesChapter.current;

        await this.readerBook.locations.generate(6000);
        /*await this.ParsePages(this.book.files, epubDataArrayBuffer);
        this.book.totalCurrentPage = this.pages.length;
        await this.ParseImages(this.book.images, epubDataArrayBuffer);*/
    }

    private storeChapters() {
        this.readerBook.loaded.navigation.then((navigation: Navigation) => {
            this.chapters = navigation.toc;
            console.log("CHAPTERS:", this.chapters);
        });
    }

    async ParsePages(pageLocationOrder: string[], epubDataArrayBuffer: ArrayBuffer) {
        const zip = new JSZip();
        const epubData = await zip.loadAsync(epubDataArrayBuffer);
        console.log('epubData:', epubData);
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
        }
    }

    prevPage(): void {
        this.rendition.prev().then(r => {
            this.updateAfterPageChange();
        });
    }
    nextPage(): void {
        this.rendition.next();

        this.updateAfterPageChange();
    }
    async updateAfterPageChange() {
        console.log(this.readerBook.locations.percentageFromCfi(this.book.currentPage));
        // @ts-ignore
        this.book.currentPage = this.rendition.currentLocation().start.cfi;
        // @ts-ignore
        this.book.percentageRead = this.readerBook.locations.percentageFromCfi(this.book.currentPage) * 100;

        // @ts-ignore
        this.totalCurrentPagesChapter.current = this.rendition.currentLocation().start.displayed.page;
        // @ts-ignore
        this.totalCurrentPagesChapter.total = this.rendition.currentLocation().start.displayed.total;
        this.totalCurrentPagesChapter.untilEnd = this.totalCurrentPagesChapter.total - this.totalCurrentPagesChapter.current;
        this.book.lastRead = new Date();
        this.setChapter();
        this.updateBook();
    }
    /*goToPage(page: number): void {
        this.book.currentPage = page;
        this.book.lastRead = new Date();
        this.setChapter();
        this.getPercentageRead();
        this.updateBook();
        // scroll to top of page
        window.scrollTo(0, 0);
        window.scrollTo(0, 0);

        // if mobile, hide menu
        if (window.innerWidth < 768) {
            this.showSearchResults = false;
        }
    }*/

    toggleTocMenu() {
        this.showToc = !this.showToc;
        // scroll to active chapter
        setTimeout(() => {
            let activeChapter = document.querySelector(".list-item.active") as HTMLElement;
            let tocContainer = document.getElementById("tocIndex") as HTMLElement;

            if (activeChapter && tocContainer) {
                tocContainer.scrollTop = activeChapter.offsetTop - 170;
            }
        }, 0);
    }

    getPageOfChapter(chapter: Toc): number {
        const page = this.pages.find(x => x.file.split('/').pop() === chapter.file.split('/').pop());
        return this.pages.indexOf(page!);
    }

    getSearchResults(): void {
        /*this.searchResults = [];
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
        }*/
    }

    getChapterOfPageFromToc(page: number) {
        /*const pageFile = this.pages[page].file.split('/').pop();
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
        return chapter;*/
    }

    setChapter(): void {
        // @ts-ignore
        let location = this.rendition.currentLocation().start;
        // get chapter
        this.chapters.forEach((x) => {
            if (x.subitems) {
                x.subitems.forEach((y) => {
                    if (y.href.includes(location.href)) {
                        this.book.currentChapter = {
                            id: y.id,
                            href: y.href,
                            label: y.label,
                            parent: '',
                            subitems: y.subitems
                        };
                    }
                });
            }
            if (x.href.includes(location.href)) {
                this.book.currentChapter = {
                    id: x.id,
                    href: x.href,
                    label: x.label,
                    parent: '',
                    subitems: x.subitems
                };
            }
        });
    }

    navigateToChapter(chapter: NavItem): void {
        this.book.currentChapter = chapter;
        this.book.currentChapter.parent = '';
        this.rendition.display(chapter.href).then(r => {
            this.updateAfterPageChange();
        });
    }

    updateBook(): void {
        this.firebaseService.Update(this.book, this.loggedUser?.uid);
    }

    GoToHome(): void {
        this.router.navigate(['/']);
    }

    async getPercentageRead() {
        await this.readerBook.locations.generate(1024).then(x => {
            console.log("percentageFromCfi:", this.readerBook.locations.percentageFromCfi(this.book.currentPage));
            this.book.percentageRead = this.readerBook.locations.percentageFromCfi(this.book.currentPage) * 100;
        });
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

    HandleSwipe() {
        const minDistance = 80;
        const container = document.querySelector('.swipe-container') as HTMLElement;

        // get the distance the user swiped
        const swipeDistance = container.scrollLeft - container.clientWidth;
        console.log("SWIPE DISTANCE:", swipeDistance);
        if (swipeDistance < minDistance * -1) {
            // swipe left
            this.prevPage();
        } else if (swipeDistance > minDistance) {
            // swipe right
            this.nextPage();
        } else {
            // no swipe
        }
    }

    HandleShowMenusMobile() {
        if (window.innerWidth < 768) {
            this.showMenusMobile = !this.showMenusMobile;
        }
    }

    formatLabel(value: number) {
        // return percentage of book read
        return (value / this.pages.length) * 100 + '%';
    }

    newNote() {
        if (!this.book.notes) {
            this.book.notes = [];
        }
        this.book.notes.push({
            id: this.IdGenerator(),
            title: '',
            note: '',
            category: NoteCategory.General,
            creationDate: new Date(),
            modificationDate: new Date()
        });
        this.edittingNoteId = this.book.notes[this.book.notes.length - 1].id;
        // order notes by modification date
        this.book.notes.sort((a, b) => {
            return new Date(b.modificationDate).getTime() - new Date(a.modificationDate).getTime();
        });

        this.updateBook();
    }

    deleteNote(note: Note) {
        this.book.notes = this.book.notes.filter(x => x.id !== note.id);
        this.updateBook();
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
