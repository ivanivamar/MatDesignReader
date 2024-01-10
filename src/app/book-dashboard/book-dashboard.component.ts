import {Component, HostListener, Injector, OnInit} from '@angular/core';
import {catchError, from, map, Observable, tap} from "rxjs";
import {Content, IEpub, EpubDto, Page, ShelvesDto, Toc} from "../common/interfaces/models";
import * as JSZip from "jszip";
import {FirebaseService} from "../common/services/firebase.service";
import {HttpClient} from "@angular/common/http";
import {AppComponentBase} from "../common/AppComponentBase";
import {Router} from "@angular/router";
import {Title} from "@angular/platform-browser";
import {LocalizationService} from "../common/services/localization.service";

@Component({
    selector: 'app-book-dashboard',
    templateUrl: './book-dashboard.component.html',
    styleUrls: ['./book-dashboard.component.css'],
    providers: [FirebaseService, HttpClient, LocalizationService]
})
export class BookDashboardComponent extends AppComponentBase implements OnInit {
    loading = true;
    photoUrl = '';
    showProfileMenu = false;
    books: EpubDto[] = [];
    shelves: ShelvesDto[] = [];
    pages: Page[] = [];
    loadingMessage = '';
    loadingProgress = 0;
    filesOrder: string[] = [];

    showShelvesModal = false;
    newShelf = new ShelvesDto();

    showBookDialog = false;
    bookCreationStepsIndex = 0;
    isBookCreation = false;
    selectedEpup: EpubDto = new EpubDto();
    maxElementsPerSize = 5;
    lastReadBooks: EpubDto[] = [];

    localizationDataUrl: any = '/assets/localizations/' + this.language + '.json';

    searchFilter = '';
    showSearch = false;

    isUserScrolling = false;

    constructor(
        injector: Injector,
        private firebaseService: FirebaseService,
        private http: HttpClient,
        private router: Router,
        private titleService: Title,
    ) {
        super(injector);
    }

    async ngOnInit(): Promise<void> {
        this.firebaseService.isLoggedIn().then(async user => {
            if (!user) {
                this.router.navigate(['login']);
            } else {
                await this.firebaseService.getUserById(user.uid).then(async (user: any) => {
                    this.user = user;
                    this.loggedUser = user;
                });
                await this.getEpubsFromFirestore();
                await this.getLocalizationFileData();
                this.titleService.setTitle("Material Reader");
            }
        });
    }

    async getEpubsFromFirestore() {
        this.books = [];
        await from(this.firebaseService.GetAllBooks(this.user.id)).subscribe(async r => {
            r.forEach((doc: any) => {
                this.books.push(doc.data());
            });
            // order by last read
            this.books.sort((a, b) => {
                //@ts-ignore
                return b.lastRead.seconds - a.lastRead.seconds;
            });

            
            await this.getShelves();
        });
    }

    async getShelves() {
        this.loading = true;
        await from(this.firebaseService.GetAllShelves(this.user.id)).subscribe(r => {
            this.shelves = r;
            this.loading = false;
            console.log("this.shelves:", this.shelves);
        });
    }

    toggleMenu(event: Event, book: EpubDto) {
        event.stopPropagation();
        event.preventDefault();
        book.showMenu = !book.showMenu;
    }

    editShelves(event: Event, book: EpubDto) {
        event.stopPropagation();
        event.preventDefault();
        this.selectedEpup = book;
        book.showMenu = false;
        this.showShelvesModal = true;
    }

    GoToReader(book: IEpub): void {
        this.router.navigate(['reader', book.id]);
    }

    handleLinkClick() {
        // Your link click logic here
        console.log('Link clicked!');
    }

    getUrlFromImageArray(imageName: string): string {
        let name = imageName.split('/')[imageName.split('/').length - 1];
        //@ts-ignore
        const image = this.images.find((i) => i.file.name === name);
        //@ts-ignore
        return image ? image.url : '';
    }

    async Upload(event: any) {
        this.loading = true;
        this.bookCreationStepsIndex = 0;
        this.isBookCreation = true;

        this.loadingProgress = 0;
        this.loadingMessage = 'Uploading epub...';

        this.selectedEpup = new EpubDto();
        this.selectedEpup.id = this.IdGenerator();
        const epubUrl = await this.firebaseService.uploadEpubToStorage(event.target.files[0], this.user.id + '/' + this.selectedEpup.id);
        this.selectedEpup.url = epubUrl;
        const epubData = await this.downloadEpub(epubUrl)
        await this.DynamicParser(epubData);

        this.loadingProgress = 100;
        this.loadingMessage = 'Uploading to firestore...';

        await this.firebaseService.Create(this.selectedEpup, this.user.id);
        this.getEpubsFromFirestore();
        this.loading = false;
    }

    onBookDialogClose() {
        this.showBookDialog = false;
        this.selectedEpup = new EpubDto();
        this.isBookCreation = false;
    }

    async DynamicParser(epubData: Observable<ArrayBuffer> | undefined) {
        // get Arraybuffer from Observable
        if (!epubData) {
            return;
        }
        const epubDataArrayBuffer = await epubData.toPromise();
        if (!epubDataArrayBuffer) {
            return;
        }

        let readerBook = this.firebaseService.getBook(epubDataArrayBuffer);

        this.loadingProgress = 20;
        this.loadingMessage = 'Parsing epub...';

        const zip = new JSZip();
        const containerXmlContent = await zip.loadAsync(epubDataArrayBuffer).then((epub) => {
            return epub.file('META-INF/container.xml')!.async('string');
        });
        const opfFilePath = await this.GetOpfFilePath(containerXmlContent);
        const opfFileParentFolder = opfFilePath.split('/').slice(0, -1).join('/');
        const opfFileContent = await zip.loadAsync(epubDataArrayBuffer).then((epub) => {
            return epub.file(opfFilePath)!.async('string');
        });

        this.loadingProgress = 40;
        this.loadingMessage = 'Getting metadata...';

        const meta = await this.GetMetadata(opfFileContent, opfFileParentFolder);
        this.selectedEpup.cover = meta.cover ? meta.cover : '';
        readerBook.loaded.metadata.then((metadata) => {
            this.selectedEpup.title = metadata.title ? metadata.title : '';
            this.selectedEpup.creator = metadata.creator ? metadata.creator : '';
            this.selectedEpup.publisher = metadata.publisher ? metadata.publisher : '';
            this.selectedEpup.date = metadata.modified_date ? metadata.modified_date : '';
            this.selectedEpup.language = metadata.language ? metadata.language : '';
        });

        this.loadingProgress = 60;
        this.loadingMessage = 'Getting cover...';

        const imagesLocation = await this.GetImagesLocation(opfFileContent, opfFileParentFolder);
        await this.SendImagesToStorage(imagesLocation, epubDataArrayBuffer);
        console.log('selectedEpup', this.selectedEpup);
    }
    async GetOpfFilePath(containerXmlContent: string) {
        let opfFilePath = '';
        const parser = new DOMParser();
        const containerXmlDoc = parser.parseFromString(containerXmlContent, 'application/xml');

        const rootFileElement = containerXmlDoc.querySelector('rootfile');
        if (rootFileElement) {
            opfFilePath = rootFileElement!.getAttribute('full-path')!;
        }

        return opfFilePath;
    }
    async GetMetadata(opfFileContent: string, opfFileParentFolder: string) {
        try {
            const parser = new DOMParser();
            const opfXmlDoc = parser.parseFromString(opfFileContent, 'application/xml');
            const metadataElement = opfXmlDoc.querySelector('metadata');
            const metadata: any = {};

            if (metadataElement) {
                const coverElement = metadataElement.querySelector('meta[name="cover"]');
                console.log("coverElement:", coverElement);
                if (coverElement) {
                    const coverId = coverElement.getAttribute('content');
                    const coverItemElement = opfXmlDoc.querySelector(`item[id="${coverId}"]`);
                    if (coverItemElement) {
                        metadata.cover = this.IsNullOrEmpty(opfFileParentFolder) ? coverItemElement.getAttribute('href') : opfFileParentFolder + '/' + coverItemElement.getAttribute('href');
                    }
                }
            } else {
                console.error('Metadata element not found in OPF file.');
            }

            return metadata;
        } catch (error) {
            console.error('Error parsing OPF XML:', error);
            return {};
        }
    }
    async GetImagesLocation(opfFileContent: string, opfFileParentFolder: string) {
        try {
            const parser = new DOMParser();
            const opfXmlDoc = parser.parseFromString(opfFileContent, 'application/xml');
            const manifestElement = opfXmlDoc.querySelector('manifest');
            const imagesLocation: ImageArray[] = [];

            if (manifestElement) {
                const itemElements = manifestElement.querySelectorAll('item');

                itemElements.forEach((itemElement) => {
                    const mediaType = itemElement.getAttribute('media-type');
                    const href = itemElement.getAttribute('href');

                    if (mediaType && href && mediaType.startsWith('image')) {
                        imagesLocation.push({
                            href: this.IsNullOrEmpty(opfFileParentFolder) ? href : opfFileParentFolder + '/' + href,
                            id: itemElement.getAttribute('id')!,
                            mediaType: mediaType
                        });
                    } else {
                        console.warn('Skipping item with missing or invalid attributes:', itemElement);
                    }
                });
            } else {
                console.error('Manifest element not found in OPF file.');
            }

            return imagesLocation;
        } catch (error) {
            console.error('Error parsing OPF XML:', error);
            return [];
        }
    }
    async SendImagesToStorage(imagesLocation: ImageArray[], epubDataArrayBuffer: ArrayBuffer) {
        // loop through imagesLocation, create Blob from ArrayBuffer
        const zip = new JSZip();
        for (const image of imagesLocation) {
            this.selectedEpup.images.push({
                href: image.href,
                id: image.id,
                mediaType: image.mediaType
            });
            // check if image is cover
            if (image.href === this.selectedEpup.cover || image.id === this.selectedEpup.cover) {
                const imageFile = await zip.loadAsync(epubDataArrayBuffer).then((epub) => {
                    return epub.file(image.href)!.async('arraybuffer');
                });
                const blob = new Blob([imageFile], {type: image.mediaType});
                const file = new File([blob], image.href.split('/')[image.href.split('/').length - 1], {type: image.mediaType});
                const url = await this.firebaseService.uploadEpubToStorage(file, this.user.id + '/' + this.selectedEpup.id);
                this.selectedEpup.cover = url;
            }
        }
    }
    async downloadEpub(epubUrl: string): Promise<Observable<ArrayBuffer>> {
        return this.http.get(epubUrl, {responseType: 'arraybuffer'});
    }

    async createOrUpdateBook() {
        if (this.isBookCreation) {
            await this.firebaseService.Create(this.selectedEpup, this.user.id);
        } else {
            await this.firebaseService.Update(this.selectedEpup, this.user.id);
        }

        await this.getEpubsFromFirestore();
        this.showBookDialog = false;
        this.selectedEpup = new EpubDto();
        this.bookCreationStepsIndex = 0;
        this.isBookCreation = false;
    }

    editBook(event: Event, book: EpubDto) {
        event.stopPropagation();
        event.preventDefault();
        book.showMenu = false;
        this.selectedEpup = book;
        this.showBookDialog = true;
    }

    async updateShelves() {
        for (const shelf of this.shelves) {
            await this.firebaseService.UpdateShelf(shelf, this.user.id);
        }
        this.showShelvesModal = false;
        this.newShelf = new ShelvesDto();
        await this.getShelves();
    }

    bookSearch(book: EpubDto): boolean {
        let titleWithoutAccents = book.title.normalize('NFD').replace(/\p{Diacritic}/gu, '');
        let authorWithoutAccents = book.creator.normalize('NFD').replace(/\p{Diacritic}/gu, '');
        return titleWithoutAccents.toLowerCase().includes(this.searchFilter.toLowerCase()) || authorWithoutAccents.toLowerCase().includes(this.searchFilter.toLowerCase());
    }
}

export interface ImageArray {
    href: string;
    mediaType: string;
    id?: string;
}
