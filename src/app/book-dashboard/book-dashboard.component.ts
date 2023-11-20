import {Component, OnInit} from '@angular/core';
import {from, Observable} from "rxjs";
import {Content, Epub, EpubDto, Page} from "../../interfaces/models";
import * as JSZip from "jszip";
import {FirebaseService} from "../../services/firebase.service";
import {HttpClient} from "@angular/common/http";
import {AppComponentBase} from "../common/AppComponentBase";
import {Router} from "@angular/router";
import {Title} from "@angular/platform-browser";

@Component({
    selector: 'app-book-dashboard',
    templateUrl: './book-dashboard.component.html',
    styleUrls: ['./book-dashboard.component.css'],
    providers: [FirebaseService, HttpClient]
})
export class BookDashboardComponent extends AppComponentBase implements OnInit {
    loading = false;
    books: Epub[] = [];
    selectedEpup: Epub = {
        id: '',
        title: '',
        creator: '',
        publisher: '',
        date: '',
        cover: '',
        url: '',
        files: [],
        images: [],
        currentPage: 0,
        totalCurrentPage: 0,
        currentChapter: null,
        percentageRead: 0,
        toc: null,
        lastRead: new Date()
    }
    pages: Page[] = [];
    loadingMessage = '';
    loadingProgress = 0;

    constructor(
        private firebaseService: FirebaseService,
        private http: HttpClient,
        private router: Router,
        private titleService: Title
    ) {
        super();
    }

    ngOnInit(): void {
        this.titleService.setTitle('Your Library');
        this.getEpubsFromFirestore();
    }

    getEpubsFromFirestore = () => {
        this.books = [];
        from(this.firebaseService.GetAllBooks()).subscribe(r => {
            r.forEach((doc: any) => {
                this.books.push(doc.data());
            });
            // order by last read
            this.books.sort((a, b) => {
                //@ts-ignore
                return this.getDateFromTimestamp(b.lastRead).localeCompare(this.getDateFromTimestamp(a.lastRead));
            });
        });
    }

    GoToReader(book: Epub): void {
        this.router.navigate(['reader', book.id]);
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

        this.loadingProgress = 0;
        this.loadingMessage = 'Uploading epub...';

        this.selectedEpup = {
            id: this.IdGenerator(),
            title: '',
            creator: '',
            publisher: '',
            date: '',
            cover: '',
            files: [],
            url: '',
            images: [],
            currentPage: 0,
            totalCurrentPage: 0,
            currentChapter: null,
            percentageRead: 0,
            toc: [],
            lastRead: new Date()
        };
        const epubUrl = await this.firebaseService.uploadEpubToStorage(event.target.files[0], this.selectedEpup.id);
        this.selectedEpup.url = epubUrl;
        const epubData = await this.downloadEpub(epubUrl)
        await this.DynamicParser(epubData);

        this.loadingProgress = 100;
        this.loadingMessage = 'Uploading to firestore...';

        await this.firebaseService.Create(this.selectedEpup);
        this.getEpubsFromFirestore();
        this.loading = false;

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
        this.selectedEpup.creator = metadata.creator ? metadata.creator : '';
        this.selectedEpup.publisher = metadata.publisher ? metadata.publisher : '';
        this.selectedEpup.date = metadata.date ? metadata.date : '';
        this.selectedEpup.cover = metadata.cover ? metadata.cover : '';

        this.loadingProgress = 60;
        this.loadingMessage = 'Getting images...';

        const imagesLocation = await this.GetImagesLocation(opfFileContent, opfFileParentFolder);
        await this.SendImagesToStorage(imagesLocation, epubDataArrayBuffer);

        this.loadingProgress = 80;
        this.loadingMessage = 'Getting pages...';

        this.selectedEpup.files = await this.GetPageLocationOrder(opfFileContent, opfFileParentFolder);
        //await this.ParsePages(this.selectedEpup.files, epubDataArrayBuffer);
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
                if (dateElement) {
                    metadata.date = dateElement.textContent;
                }
                if (coverElement) {
                    const coverId = coverElement.getAttribute('content');
                    const coverItemElement = opfXmlDoc.querySelector(`item[id="${coverId}"]`);
                    if (coverItemElement) {
                        metadata.cover = opfFileParentFolder + '/' + coverItemElement.getAttribute('href');
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
                            href: opfFileParentFolder + '/' + href,
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
                mediaType: image.mediaType
            });
            // check if image is cover
            if (image.href === this.selectedEpup.cover) {
                const imageFile = await zip.loadAsync(epubDataArrayBuffer).then((epub) => {
                    return epub.file(image.href)!.async('arraybuffer');
                });
                const blob = new Blob([imageFile], {type: image.mediaType});
                const file = new File([blob], image.href.split('/')[image.href.split('/').length - 1], {type: image.mediaType});
                const url = await this.firebaseService.uploadEpubToStorage(file, this.selectedEpup.id);
                this.selectedEpup.cover = url;
            }
        }
    }
    async GetPageLocationOrder(opfFileContent: string, opfFileParentFolder: string) {
        try {
            const parser = new DOMParser();
            const opfXmlDoc = parser.parseFromString(opfFileContent, 'application/xml');
            const manifestElement = opfXmlDoc.querySelector('manifest');
            const pageLocationOrder: string[] = [];

            if (manifestElement) {
                const itemElements = manifestElement.querySelectorAll('item');

                itemElements.forEach((itemElement) => {
                    const mediaType = itemElement.getAttribute('media-type');
                    const href = itemElement.getAttribute('href');

                    if (mediaType && href && mediaType === 'application/xhtml+xml') {
                        pageLocationOrder.push(opfFileParentFolder + '/' + href);
                    } else {
                        console.warn('Skipping item with missing or invalid attributes:', itemElement);
                    }
                });
            } else {
                console.error('Manifest element not found in OPF file.');
            }

            return pageLocationOrder;
        } catch (error) {
            console.error('Error parsing OPF XML:', error);
            return [];
        }
    }

    async downloadEpub(epubUrl: string): Promise<Observable<ArrayBuffer>> {
        return this.http.get(epubUrl, {responseType: 'arraybuffer'});
    }

    getDateFromTimestamp(timestamp: any): string {
        let date = new Date(timestamp.seconds * 1000);
        // format dd/mm/yyyy HH:mm
        return date.getDate() + '/' + date.getMonth() + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes();
    }
}

export interface ImageArray {
    href: string;
    mediaType: string;
}
