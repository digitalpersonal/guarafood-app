import React, { useState, useEffect } from 'react';
import { supabase } from '../services/api';

interface ImageUploadFieldProps {
    restaurantId: number;
    currentImageUrl: string | null;
    onImageUploaded: (url: string) => void;
    label?: string;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ restaurantId, currentImageUrl, onImageUploaded, label = "Foto" }) => {
    const [imagePreview, setImagePreview] = useState<string | null>(currentImageUrl);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        setImagePreview(currentImageUrl);
    }, [currentImageUrl]);

    const compressImage = async (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(img.src);
                    reject(new Error("Não foi possível processar a imagem."));
                    return;
                }

                const MAX_WIDTH = 600;
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(img.src);
                    if (blob) {
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    } else {
                        reject(new Error("Falha na compressão."));
                    }
                }, 'image/jpeg', 0.5);
            };
            img.onerror = (err) => {
                URL.revokeObjectURL(img.src);
                reject(err);
            };
        });
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const originalFile = e.target.files[0];
            setIsUploading(true);
            try {
                const compressedFile = await compressImage(originalFile);
                
                const fileExt = 'jpg';
                const fileName = `${crypto.randomUUID()}.${fileExt}`;
                const filePath = `${restaurantId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(filePath, compressedFile, {
                        contentType: 'image/jpeg',
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(filePath);

                setImagePreview(data.publicUrl);
                onImageUploaded(data.publicUrl);
            } catch (err) {
                console.error("Erro ao fazer upload da imagem:", err);
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="flex items-center gap-4">
                {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-md object-cover" />
                ) : (
                    <div className="w-20 h-20 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-xs p-2 text-center">
                        Sem Imagem
                    </div>
                )}
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isUploading}
                    className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-orange-50 file:text-orange-700
                        hover:file:bg-orange-100"
                />
            </div>
            {isUploading && <p className="text-xs text-orange-600 font-bold">Enviando imagem...</p>}
        </div>
    );
};

export default ImageUploadField;
