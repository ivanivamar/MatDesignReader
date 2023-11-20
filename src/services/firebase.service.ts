import {Injectable} from '@angular/core';
import {initializeApp} from "firebase/app";
import {getStorage, ref, uploadBytes, getDownloadURL, getMetadata} from "firebase/storage";
import {addDoc, collection, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where} from "firebase/firestore";
import {combineLatest, map, Observable} from "rxjs";
import {Epub} from "../interfaces/models";

@Injectable({
    providedIn: 'root'
})
export class FirebaseService {
    firebaseConfig = {
        apiKey: "AIzaSyAX40V_rCpyevrwly1Uu3hUgxKH10RCuhQ",
        authDomain: "matdesignreader.firebaseapp.com",
        projectId: "matdesignreader",
        storageBucket: "matdesignreader.appspot.com",
        messagingSenderId: "1061944382265",
        appId: "1:1061944382265:web:def601474e4c1d15fd4ee8"
    };
    app = initializeApp(this.firebaseConfig);
    db = getFirestore(this.app);
    storage = getStorage(this.app)

    constructor() {
    }

    // Firestore:
    GetAllBooks = async () => {
        const epubRef = collection(this.db, 'books');
        const epubSnapshot = await getDocs(epubRef);
        return epubSnapshot;
    }
    async GetById(id: string): Promise<Epub> {
        const projectRef = collection(this.db, "books");
        const q = query(projectRef, where("id", "==", id));
        const querySnapshot = await getDocs(q);
        const epub = querySnapshot.docs.map((doc) => doc.data());
        return epub[0] as Epub;
    }
    async Create(epub: Epub) {
        console.log("epub", epub);
        await setDoc(doc(this.db, "books", epub.id.toString()), epub);
    }
    async Update(epub: any) {
        const bookRef = doc(this.db, 'books', epub.id);
        await updateDoc(bookRef, epub);
    }

    // Storage:
    async uploadEpubToStorage(epubFile: File, referenceName: string): Promise<any> {
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
    getEpubFromStorage = async (epubName: string) => {
        return getDownloadURL(ref(this.storage, "epubs/" + epubName))
            .then((url: string) => {
                    return url;
                }
            );
    }
}
