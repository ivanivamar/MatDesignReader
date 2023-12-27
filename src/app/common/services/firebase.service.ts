import {Injectable} from '@angular/core';
import {initializeApp} from "firebase/app";
import {getStorage, ref, uploadBytes, getDownloadURL, getMetadata} from "firebase/storage";
import {addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where} from "firebase/firestore";
import {combineLatest, map, Observable} from "rxjs";
import {Epub, ShelvesDto} from "../interfaces/models";
import {HttpClient} from "@angular/common/http";
import {GoogleAuthProvider, getAuth, signInWithPopup} from "firebase/auth";
import {AppComponentBase} from "../AppComponentBase";
import {LocalizationService} from "./localization.service";

@Injectable({
    providedIn: 'root'
})
export class FirebaseService {
    baseUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
    googleBooksApiUrl = 'https://www.googleapis.com/books/v1/volumes?q=';
    firebaseConfig = {
        apiKey: "AIzaSyAX40V_rCpyevrwly1Uu3hUgxKH10RCuhQ",
        authDomain: "matdesignreader.firebaseapp.com",
        projectId: "matdesignreader",
        storageBucket: "matdesignreader.appspot.com",
        messagingSenderId: "1061944382265",
        appId: "1:1061944382265:web:3eae596bc58df0d9fd4ee8"
    };
    app = initializeApp(this.firebaseConfig);
    db = getFirestore(this.app);
    storage = getStorage(this.app);
    auth = getAuth(this.app);
    provider = new GoogleAuthProvider();

    constructor(
        private http: HttpClient,
    ) {
    }

    // Auth:
    googleLogin() {
        return signInWithPopup(this.auth, new GoogleAuthProvider());
    }

    async isLoggedIn(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.auth.onAuthStateChanged((user) => {
                resolve(user);
            });
        });
    }

    logout() {
        return this.auth.signOut();
    }

    // Dictionary:
    getDefinition(word: string, language: string): Observable<any> {
        const url = `${this.baseUrl}${word}`;
        return this.http.get(url);
    }

    getGoogleBooks(query: string): Observable<any> {
        const url = `${this.googleBooksApiUrl}${query}`;
        return this.http.get(url);
    }

    // Firestore:
    GetAllBooks = async (referenceName: any) => {
        const epubRef = collection(this.db, referenceName + '_books');
        const epubSnapshot = await getDocs(epubRef);
        return epubSnapshot;
    }
    async GetAllShelves (referenceName: any): Promise<ShelvesDto[]> {
        const shelvesRef = collection(this.db, referenceName + '_shelves');
        const shelvesSnapshot = await getDocs(query(shelvesRef));
        let shelves: ShelvesDto[] = shelvesSnapshot.docs.map((doc) => doc.data()) as ShelvesDto[];
        // get books:
        for (const shelf of shelves) {
            shelf['books'] = [];
            for (const bookId of shelf['bookIds']) {
                const book = await this.GetById(bookId, referenceName);
                shelf['books'].push(book);
            }
            // sort books by last read:
            shelf['books'].sort((a: Epub, b: Epub) => (a.lastRead < b.lastRead) ? 1 : -1);
        }

        return shelves;
    }
    async GetById(id: string, referenceName: any): Promise<Epub> {
        const projectRef = collection(this.db, referenceName + "_books");
        const q = query(projectRef, where("id", "==", id));
        const querySnapshot = await getDocs(q);
        const epub = querySnapshot.docs.map((doc) => doc.data());
        return epub[0] as Epub;
    }
    async GetShelfById(id: string, referenceName: any): Promise<any> {
        const projectRef = collection(this.db, referenceName + "_shelves");
        const q = query(projectRef, where("id", "==", id));
        const querySnapshot = await getDocs(q);
        let shelf = querySnapshot.docs.map((doc) => doc.data())[0];
        // get books:
        shelf['books'] = [];
        for (const bookId of shelf['books']) {
            const book = await this.GetById(bookId, referenceName);
            shelf['books'].push(book);
        }
        // sort books by last read:
        shelf['books'].sort((a: Epub, b: Epub) => (a.lastRead > b.lastRead) ? 1 : -1);

        return shelf;
    }
    async Create(epub: Epub, referenceName: any) {
        await setDoc(doc(this.db, referenceName + "_books", epub.id.toString()), {
            id: epub.id,
            title: epub.title,
            creator: epub.creator,
            publisher: epub.publisher,
            date: epub.date,
            cover: epub.cover,
            url: epub.url,
            files: epub.files,
            images: epub.images,
            currentPage: epub.currentPage,
            totalCurrentPage: epub.totalCurrentPage,
            currentChapter: epub.currentChapter,
            percentageRead: epub.percentageRead,
            toc: epub.toc,
            lastRead: new Date(),
            language: epub.language
        });
    }
    async CreateShelf(shelf: any, referenceName: any) {
        await setDoc(doc(this.db, referenceName + "_shelves", shelf.id.toString()), {
            id: shelf.id,
            name: shelf.name,
            bookIds: [],
            lastRead: new Date()
        });
    }
    async Update(epub: any, referenceName: any) {
        const bookRef = doc(this.db, referenceName + "_books", epub.id);
        await updateDoc(bookRef, epub);
    }
    async UpdateShelf(shelf: any, referenceName: any) {
        const bookRef = doc(this.db, referenceName + "_shelves", shelf.id);
        await updateDoc(bookRef, {
            name: shelf.name,
            bookIds: shelf.bookIds,
            lastRead: new Date()
        });
    }
    async Delete(id: string, referenceName: any) {
        const bookRef = doc(this.db, referenceName + "_books", id);
        await deleteDoc(bookRef);
    }
    async DeleteShelf(id: string, referenceName: any) {
        const bookRef = doc(this.db, referenceName + "_shelves", id);
        await deleteDoc(bookRef);
    }

    // Storage:
    async uploadEpubToStorage(epubFile: File, referenceName: any): Promise<any> {
        const storageRef = ref(this.storage, referenceName + "/" + epubFile.name);

        try {
            const response = await uploadBytes(storageRef, epubFile);
            return await combineLatest([
                getDownloadURL(response.ref)
            ]).pipe(
                map(([url]) => {
                    return url;
                })
            ).toPromise();
        } catch (error) {
            return console.log(error);
        }
    }
}
