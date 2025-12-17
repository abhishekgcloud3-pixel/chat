import { useState } from 'react';
import axios from 'axios';
import { validateImage } from '@/lib/validators/image';
import { toast } from 'sonner';

interface UploadResult {
  url: string;
  width: number;
  height: number;
  format: string;
}

interface UseImageUploadReturn {
  uploadImage: (file: File) => Promise<UploadResult | null>;
  isUploading: boolean;
  error: string | null;
  progress: number;
}

export function useImageUpload(): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadImage = async (file: File): Promise<UploadResult | null> => {
    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      const validation = validateImage(file);
      if (!validation.valid) {
        const errorMsg = validation.error || 'Invalid file';
        setError(errorMsg);
        toast.error(errorMsg);
        setIsUploading(false);
        return null;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        },
      });

      if (response.data.success) {
        setIsUploading(false);
        return response.data;
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }

    } catch (err: any) {
      console.error('Upload error:', err);
      const msg = err.response?.data?.error || err.message || 'Upload failed';
      setError(msg);
      toast.error(msg);
      setIsUploading(false);
      return null;
    }
  };

  return { uploadImage, isUploading, error, progress };
}
