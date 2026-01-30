import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

interface UploadResult {
    progress: number;
    url: string | null;
    error: Error | null;
    isUploading: boolean;
    uploadFile: (file: Blob | File, path: string) => Promise<string>;
}

export function useStorage(): UploadResult {
    const [progress, setProgress] = useState(0);
    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const uploadFile = async (file: Blob | File, path: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            setIsUploading(true);
            setProgress(0);
            setError(null);
            setUrl(null);

            const storageRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setProgress(p);
                },
                (err) => {
                    console.error("Upload failed", err);
                    setError(err);
                    setIsUploading(false);
                    reject(err);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        setUrl(downloadURL);
                        setIsUploading(false);
                        resolve(downloadURL);
                    } catch (err) { // Cast err to any or Error to satisfy typescript
                        console.error("Failed to get download URL", err);
                        setError(err as Error);
                        setIsUploading(false);
                        reject(err);
                    }
                }
            );
        });
    };

    return { progress, url, error, isUploading, uploadFile };
}
