import { AfterViewInit, Component, HostListener, Injector, OnInit } from '@angular/core';
import { AppComponentBase } from "../../common/AppComponentBase";
import { EpubDto, Note, NoteCategory, Page, Toc } from "../../common/interfaces/models";
import { FirebaseService } from "../../common/services/firebase.service";
import { from, Observable } from "rxjs";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import * as JSZip from "jszip";
import { Title } from "@angular/platform-browser";
import { Book } from "epubjs";
import { Rendition } from "epubjs";
import Navigation, { NavItem } from "epubjs/types/navigation";
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

    showSettings = false;

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
        this.firebaseService.isLoggedIn().then(async user => {
            if (!user) {
                this.router.navigate(['login']);
            } else {
                await this.firebaseService.getUserById(user.uid).then(async (user: any) => {
                    this.user = user;
                    this.loggedUser = user;
                });
                const id = window.location.pathname.split('/')[2];
                const doc = document.documentElement;
                doc.style.setProperty('--doc-height', `${window.innerHeight}px`);

                from(this.firebaseService.GetById(id, this.user.id)).subscribe(async (book) => {
                    this.book = book as EpubDto;
                    console.log("BOOK:", this.book);
                    this.titleService.setTitle(this.book.title);
                    this.book.lastRead = new Date();

                    this.epubData = await this.downloadEpub(this.book.url);
                    await this.DynamicParser(this.epubData);
                    this.updateBook();
                    await this.getLocalizationFileData();
                });
            }
        });
    }
    async downloadEpub(epubUrl: string): Promise<Observable<ArrayBuffer>> {
        return this.http.get(epubUrl, { responseType: 'arraybuffer' });
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
        this.setTheme();

        // @ts-ignore
        if (typeof this.book.currentPage == 'string' && this.book.currentPage !== '') {
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
    }

    setTheme() {
        console.log("SETTING THEME", this.user.textSize);
        // style the epub
        if (this.user.darkTheme) {
            this.rendition.themes.default({
                "body": {
                    "background-color": "unset !important"
                },
                "p": {
                    "margin": "12px 0 !important",
                    "padding": "0em",
                    "font-size": this.user.textSize + "px !important",
                    "font-family": this.user.fontFamily + " !important",
                    "font-weight": "400 !important",
                    "color": "#c4c7c5 !important",
                    "line-height": "151.875% !important"
                },
                "h1": {
                    "line-height": "151.875% !important",
                    "color": "#c4c7c5 !important",
                    "margin-bottom": "0.5rem !important",
                    "font-family": this.user.fontFamily + " !important",
                    "font-weight": "bold !important"
                },
                "h2": {
                    "line-height": "151.875% !important",
                    "color": "#c4c7c5 !important",
                    "margin-bottom": "0.5rem !important",
                    "font-family": this.user.fontFamily + " !important",
                    "font-weight": "bold !important"
                },
                "h3": {
                    "line-height": "151.875% !important",
                    "color": "#c4c7c5 !important",
                    "margin-bottom": "0.5rem !important",
                    "font-family": this.user.fontFamily + " !important",
                    "font-weight": "bold !important"
                },
                "blockquote": {
                    "font-family": this.user.fontFamily + " !important",
                    "color": "#c4c7c5 !important",
                    "margin": "12px 0 !important"
                },
                "a": {
                    "font-family": this.user.fontFamily + " !important",
                    "color": "#c4c7c5 !important",
                    "text-decoration": "none !important"
                },
                "em": {
                    "font-family": this.user.fontFamily + " !important",
                    "color": "#c4c7c5 !important",
                    "margin": "12px 0 !important"
                }
            });
        } else {
            this.rendition.themes.default({
                "body": {
                    "background-color": "#fff !important"
                },
                "p": {
                    "margin": "12px 0 !important",
                    "padding": "0em",
                    "font-size": this.user.textSize + "px !important",
                    "font-family": this.user.fontFamily + " !important",
                    "font-weight": "400 !important",
                    "color": "#000 !important",
                    "line-height": "151.875% !important"
                },
                "h1": {
                    "line-height": "151.875% !important",
                    "color": "#000 !important",
                    "margin-bottom": "0.5rem !important",
                    "font-family": this.user.fontFamily + " !important",
                    "font-weight": "bold !important"
                },
                "h2": {
                    "line-height": "151.875% !important",
                    "color": "#000 !important",
                    "margin-bottom": "0.5rem !important",
                    "font-family": this.user.fontFamily + " !important",
                    "font-weight": "bold !important"
                },
                "h3": {
                    "line-height": "151.875% !important",
                    "color": "#000 !important",
                    "margin-bottom": "0.5rem !important",
                    "font-family": this.user.fontFamily + " !important",
                    "font-weight": "bold !important"
                },
                "blockquote": {
                    "font-family": this.user.fontFamily + " !important",
                    "color": "#000 !important",
                    "margin": "12px 0 !important"
                },
                "a": {
                    "font-family": this.user.fontFamily + " !important",
                    "color": "#000 !important",
                    "text-decoration": "none !important"
                },
                "em": {
                    "font-family": this.user.fontFamily + " !important",
                    "color": "#000 !important",
                    "margin": "12px 0 !important"
                }
            });
        }

    }

    private storeChapters() {
        this.readerBook.loaded.navigation.then((navigation: Navigation) => {
            this.chapters = navigation.toc;
            console.log("CHAPTERS:", this.chapters);
        });
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

    async updateUser(event?: any) {
        console.log("UPDATE USER:", this.user, event);
        if (event) {
            this.user.darkTheme = event.checked;
        }
        await this.firebaseService.updateUser(this.user);
        // refresh book
        this.rendition.destroy();
        this.DynamicParser(this.epubData);
    }

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
        this.firebaseService.Update(this.book, this.user.id);
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
    word: string;
    phonetic: string;
    phonetics: Phonetic[];
    origin: string;
    meanings: Meaning[];
}

export interface Meaning {
    partOfSpeech: string;
    definitions: Definition[];
}

export interface Definition {
    definition: string;
    example: string;
    synonyms: any[];
    antonyms: any[];
}

export interface Phonetic {
    text: string;
    audio?: string;
}
