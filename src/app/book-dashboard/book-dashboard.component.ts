import {Component, Injector, OnInit} from '@angular/core';
import {catchError, from, map, Observable, tap} from "rxjs";
import {Content, Epub, EpubDto, Page, ShelvesDto, Toc} from "../common/interfaces/models";
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
                this.loggedUser = user;
                console.log("USER:", this.loggedUser);
                await this.getEpubsFromFirestore();
                await this.getShelves();
                await this.getLocalizationFileData();
                let title = this.l('YourLibrary');
                console.log("title:", title);
                this.titleService.setTitle(title);
                this.loading = false;
            }
        });
    }

    async getEpubsFromFirestore() {
        this.books = [];
        from(this.firebaseService.GetAllBooks(this.loggedUser?.uid)).subscribe(r => {
            r.forEach((doc: any) => {
                this.books.push(doc.data());
            });
            // order by last read
            this.books.sort((a, b) => {
                //@ts-ignore
                return b.lastRead.seconds - a.lastRead.seconds;
            });
        });
    }

    async getShelves() {
        from(this.firebaseService.GetAllShelves(this.loggedUser?.uid)).subscribe(r => {
            this.shelves = r;
            console.log("this.shelves:", this.shelves);
        });
    }

    checkIfHasBook(shelf: ShelvesDto, book: EpubDto): boolean {
        let hasBook = false;

        if (shelf.bookIds.length > 0) {
            shelf.bookIds.forEach((bId: string) => {
                if (bId === book.id) {
                    hasBook = true;
                }
            });
        }
        return hasBook;
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

    GoToReader(book: Epub): void {
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
        const epubUrl = await this.firebaseService.uploadEpubToStorage(event.target.files[0], this.loggedUser?.uid);
        this.selectedEpup.url = epubUrl;
        const epubData = await this.downloadEpub(epubUrl)
        await this.DynamicParser(epubData);

        this.loadingProgress = 100;
        this.loadingMessage = 'Uploading to firestore...';

        await this.firebaseService.Create(this.selectedEpup, this.loggedUser?.uid);
        this.getEpubsFromFirestore();
        this.loading = false;

    }

    onBookDialogClose() {
        this.showBookDialog = false;
        this.selectedEpup = new EpubDto();
        this.bookCreationStepsIndex = 0;
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

        const metadata = await this.GetMetadata(opfFileContent, opfFileParentFolder);
        this.selectedEpup.title = metadata.title ? metadata.title : '';
        this.selectedEpup.cover = metadata.cover ? metadata.cover : '';

        this.firebaseService.getGoogleBooks(this.selectedEpup.title).subscribe((data) => {
            // find first element which saleInfo is not "NOT_FOR_SALE"
            let trueData = data.items.find((item: any) => item.saleInfo.saleability !== 'NOT_FOR_SALE');
            this.selectedEpup.description = trueData.volumeInfo.description;
            this.selectedEpup.pages = trueData.volumeInfo.pageCount;
            this.selectedEpup.language = trueData.volumeInfo.language;
            this.selectedEpup.date = new Date(trueData.volumeInfo.publishedDate).getFullYear().toString();
            this.selectedEpup.publisher = trueData.volumeInfo.publisher;
        });

        this.loadingProgress = 60;
        this.loadingMessage = 'Getting images...';

        const imagesLocation = await this.GetImagesLocation(opfFileContent, opfFileParentFolder);
        await this.SendImagesToStorage(imagesLocation, epubDataArrayBuffer);

        this.loadingProgress = 80;
        this.loadingMessage = 'Getting pages...';

        await this.ParseToc(epubDataArrayBuffer);
        this.selectedEpup.files = await this.GetPageLocationOrder(opfFileContent, opfFileParentFolder);
        this.showBookDialog = true;
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
                const titleElement = metadataElement.querySelector('title');
                const creatorElement = metadataElement.querySelector('creator');
                const publisherElement = metadataElement.querySelector('publisher');
                const contributorElement = metadataElement.querySelector('contributor');
                const dateElement = metadataElement.querySelector('date');
                const languageElement = metadataElement.querySelector('language');
                const coverElement = metadataElement.querySelector('meta[name="cover"]');

                if (titleElement) {
                    metadata.title = titleElement.textContent;
                }
                if (creatorElement) {
                    metadata.creator = creatorElement.textContent;
                }
                if (publisherElement) {
                    metadata.publisher = publisherElement.textContent;
                } else if (contributorElement) {
                    metadata.publisher = contributorElement.textContent;
                }
                if (languageElement) {
                    metadata.language = languageElement.textContent;
                }
                if (dateElement) {
                    metadata.date = dateElement.textContent;
                }
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
                const url = await this.firebaseService.uploadEpubToStorage(file, this.loggedUser?.uid + '/' + this.selectedEpup.id);
                this.selectedEpup.cover = url;
            }
        }
    }
    async ParseToc(epubDataArrayBuffer: ArrayBuffer) {
        // search for .ncx file
        const zip = new JSZip();
        let ncxFile: string = '';
        const epubData = await zip.loadAsync(epubDataArrayBuffer);
        await zip.loadAsync(epubDataArrayBuffer).then((epub) => {
            epub.forEach((relativePath, zipEntry) => {
                if (zipEntry.name.endsWith('.ncx')) {
                    ncxFile = zipEntry.name;
                }
            });
        });
        if (ncxFile === '') {
            return;
        }
        const tocFile = await epubData.file(ncxFile)!.async('string');
        if (!tocFile) {
            return;
        }

        const parser = new DOMParser();
        const ncxXmlDoc = parser.parseFromString(tocFile, 'application/xml');
        console.log("ncxXmlDoc:", ncxXmlDoc);
        const navMap = ncxXmlDoc.querySelector('navMap');
        if (!navMap) {
            return;
        }
        // format for object Toc
        const toc: Toc[] = [];
        // loop children of navMap
        if (navMap.children.length > 0) {
            for (let i = 0; i < navMap.children.length; i++) {
                const navPoint = navMap.children[i];
                if (navPoint.children.length > 0) {
                    const tocItem: Toc = {
                        title: '',
                        file: '',
                        subItems: []
                    };
                    for (let j = 0; j < navPoint.children.length; j++) {
                        const navPointChild = navPoint.children[j];
                        if (navPointChild.nodeName === 'navLabel') {
                            tocItem.title = navPointChild.children[0].textContent!;
                        } else if (navPointChild.nodeName === 'content') {
                            tocItem.file = navPointChild.getAttribute('src')!;
                        } else if (navPointChild.nodeName === 'navPoint') {
                            const subItem: Toc = {
                                title: '',
                                file: '',
                                subItems: []
                            };
                            for (let k = 0; k < navPointChild.children.length; k++) {
                                const navPointChildChild = navPointChild.children[k];
                                if (navPointChildChild.nodeName === 'navLabel') {
                                    subItem.title = navPointChildChild.children[0].textContent!;
                                } else if (navPointChildChild.nodeName === 'content') {
                                    subItem.file = navPointChildChild.getAttribute('src')!;
                                }
                            }
                            tocItem.subItems.push(subItem);
                        }
                    }
                    this.selectedEpup.toc.push(tocItem);
                }
            }
        }

        this.selectedEpup.currentChapter = this.selectedEpup.toc[0];
    }
    async GetPageLocationOrder(opfFileContent: string, opfFileParentFolder: string) {
        try {
            const parser = new DOMParser();
            const opfXmlDoc = parser.parseFromString(opfFileContent, 'application/xml');
            const manifestElement = opfXmlDoc.querySelector('manifest');
            const spineElement = opfXmlDoc.querySelector('spine');
            const pageLocationOrder: any[] = [];
            const finalPageLocationOrder: string[] = [];

            if (manifestElement) {
                const itemElements = manifestElement.querySelectorAll('item');

                itemElements.forEach((itemElement) => {
                    const mediaType = itemElement.getAttribute('media-type');
                    const href = itemElement.getAttribute('href');

                    if (mediaType && href && mediaType === 'application/xhtml+xml') {
                        let temp = this.IsNullOrEmpty(opfFileParentFolder) ? href : opfFileParentFolder + '/' + href
                        pageLocationOrder.push({
                            id: itemElement.getAttribute('id')!,
                            href: temp
                        });
                    } else {
                        console.warn('Skipping item with missing or invalid attributes:', itemElement);
                    }
                });
            } else {
                console.error('Manifest element not found in OPF file.');
            }

            if (spineElement) {
                const itemRefElements = spineElement.querySelectorAll('itemref');

                itemRefElements.forEach((itemRefElement) => {
                    const idref = itemRefElement.getAttribute('idref');

                    if (idref) {
                        this.filesOrder.push(idref);
                    } else {
                        console.warn('Skipping itemref with missing or invalid attributes:', itemRefElement);
                    }
                });
            }
            console.log("pageLocationOrder:", pageLocationOrder);
            this.filesOrder.forEach((file) => {
                pageLocationOrder.forEach((page) => {
                    if (file == page.id) {
                        finalPageLocationOrder.push(page.href);
                        // remove page from array
                        pageLocationOrder.splice(pageLocationOrder.indexOf(page), 1);
                    }
                });
            });

            return finalPageLocationOrder;
        } catch (error) {
            console.error('Error parsing OPF XML:', error);
            return [];
        }
    }
    async downloadEpub(epubUrl: string): Promise<Observable<ArrayBuffer>> {
        return this.http.get(epubUrl, {responseType: 'arraybuffer'});
    }

    showBookMenu() {
    }

    async createOrUpdateBook() {
        if (this.isBookCreation) {
            await this.firebaseService.Create(this.selectedEpup, this.loggedUser?.uid);
        } else {
            await this.firebaseService.Update(this.selectedEpup, this.loggedUser?.uid);
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

    toggleShelf(shelf: ShelvesDto, book: EpubDto) {
        if (shelf.bookIds.includes(book.id)) {
            shelf.bookIds = shelf.bookIds.filter((bId) => bId !== book.id);
        } else {
            shelf.bookIds.push(book.id);
        }
    }

    async addShelf() {
        this.newShelf.id = this.IdGenerator();
        await this.firebaseService.CreateShelf(this.newShelf, this.loggedUser?.uid);
        this.shelves.push(this.newShelf);
        this.newShelf.bookIds.push(this.selectedEpup.id);
        this.newShelf = new ShelvesDto();
        await this.updateShelves();
    }

    async updateShelves() {
        for (const shelf of this.shelves) {
            await this.firebaseService.UpdateShelf(shelf, this.loggedUser?.uid);
        }
        this.showShelvesModal = false;
        this.newShelf = new ShelvesDto();
        await this.getShelves();
    }

    async deleteShelf(shelf: ShelvesDto) {
        await this.firebaseService.DeleteShelf(shelf.id, this.loggedUser?.uid);
        await this.getShelves();
    }

    async deleteBook(event: Event, book: Epub): Promise<void> {
        event.stopPropagation();
        event.preventDefault();
        // remove book from shelf if exists
        for (const shelf of this.shelves) {
            shelf.bookIds = shelf.bookIds.filter((bId) => bId !== book.id);
            await this.firebaseService.UpdateShelf(shelf, this.loggedUser?.uid);
        }

        await this.firebaseService.Delete(book.id, this.loggedUser?.uid);
        this.showBookDialog = false;
        this.selectedEpup.showMenu = false;
        this.selectedEpup = new EpubDto();
        await this.getEpubsFromFirestore();
    }
}

export interface ImageArray {
    href: string;
    mediaType: string;
    id?: string;
}
