export interface Epub {
    id: string;
    title: string;
    creator: string;
    publisher: string;
    date: string;
    cover: string;
    url: string;
    files: string[];
    images: any[];
    currentPage: number;
    totalCurrentPage: number;
    currentChapter: Toc;
    percentageRead: number;
    toc: Toc[];
    lastRead: Date;
    language: string;
    rating: number;
    pages: number;
    description: string;
    notes: Note[];
}

export class EpubDto {
    id: string = '';
    title: string = '';
    creator: string = '';
    publisher: string = '';
    date: string = '';
    cover: string = '';
    url: string = '';
    files: string[] = [];
    images: any[] = [];
    currentPage: number = 0;
    totalCurrentPage: number = 0;
    percentageRead: number = 0;
    currentChapter: Toc = {title: '', file: '', subItems: []};
    toc: Toc[] = [];
    lastRead: Date = new Date();
    language: string = '';
    private showToc: boolean = false;
    showMenu: boolean = false;
    rating: number = 0;
    pages: number = 0;
    description: string = '';
    notes: Note[] = [];
}
export interface Page {
    file: string;
    content: Content[];
}
export interface Content {
    type: string;
    value: string;
}
export interface Toc {
    title: string;
    file: string;
    subItems: Toc[];
}

export interface Note {
    id: string;
    title: string;
    note: string;
    category: NoteCategory;
    creationDate: Date;
    modificationDate: Date;
}
export enum NoteCategory {
    General = 1,
    Highlight = 2,
    Bookmark = 3
}

export class ShelvesDto {
    id: string = '';
    name: string = '';
    bookIds: string[] = [];
    books: Epub[] = [];
    lastRead: Date = new Date();
}
