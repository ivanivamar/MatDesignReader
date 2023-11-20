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
}

export class EpubDto implements Epub {
    id!: string;
    title!: string;
    creator!: string;
    publisher!: string;
    date!: string;
    cover!: string;
    url!: string;
    files!: string[];
    images!: any[];
    currentPage!: number;
    totalCurrentPage!: number;
    percentageRead!: number;
    currentChapter!: Toc;
    toc!: Toc[];
    lastRead!: Date;

    constructor(data?: Epub) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }
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
