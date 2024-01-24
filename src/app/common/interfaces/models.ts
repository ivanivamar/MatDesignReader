import {NavItem} from "epubjs/types/navigation";
import {EpubCFI} from "epubjs";

export interface IEpub {
    id: string;
    title: string;
    creator: string;
    publisher: string;
    date: string;
    cover: string;
    url: string;
    files: string[];
    images: any[];
    currentPage: string;
    totalCurrentPage: number;
    currentChapter: NavItem;
    percentageRead: number;
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
    currentPage: string = '';
    totalCurrentPage: number = 0;
    percentageRead: number = 0;
    currentChapter: NavItem = {id: '', href: '', label: '', parent: '', subitems: []};
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
    books: IEpub[] = [];
    lastRead: Date = new Date();
}

export interface IUser {
    id: string;
    name: string;
    email: string;
    password: string;
    profilePicture: string;
    textSize: number;
    darkTheme: boolean;
    fontFamily: string;
    language: string;
}

export class UserDto {
    id: string = '';
    name: string = '';
    email: string = '';
    password: string = '';
    profilePicture: string = '';
    textSize: number = 0;
    darkTheme: boolean = false;
    fontFamily: string = 'trebuchet ms, sans-serif';
    language: string = '';
}

export interface IDropdownOption {
    value: any;
    icon?: string;
    iconColor?: string;
    label: string;
    selected?: boolean;
}
