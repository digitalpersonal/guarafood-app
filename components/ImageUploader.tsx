import React, { useState, useEffect, useRef } from 'react';
import { generateImage } from '../services/databaseService';
import Spinner from './Spinner';

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 01-1.4-1.4l-1.188-.648 1.188-.648a2.25 2.25 0 011.4-1.4l.648-1.188.648 1.188a2.25 2.25 0 011.4 1.4l1.188.648-1.188.648a2.25 2.25 0 01-1.4 1.4z" />
    </svg>
);

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);


interface ImageUploaderProps {
    imageUrl: string;
    onImageUpdate: (newUrl: string) => void;
    promptSuggestion: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ imageUrl, onImageUpdate, promptSuggestion }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [prompt, setPrompt] = useState(promptSuggestion);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setPrompt(promptSuggestion);
    }, [promptSuggestion]);
    
    const handleGenerateImage = async () => {
        if (!prompt) {
            setError('Please enter a prompt to generate an image.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const newImageUrl = await generateImage(prompt, '4:3');
            onImageUpdate(newImageUrl);
        } catch (err: any) {
            console.error("Image generation failed:", err);
            setError(err.message || "Failed to generate image. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onImageUpdate(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Imagem do Restaurante
                </label>
                <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover"/>
                    {isLoading && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                            <Spinner message="Gerando imagem..." />
                        </div>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                 <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-white text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 border border-gray-300 transition-colors disabled:bg-gray-300"
                >
                    <UploadIcon className="w-5 h-5"/>
                    <span>Carregar Local</span>
                </button>
                 <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-gray-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400"
                >
                    <SparklesIcon className="w-5 h-5"/>
                    <span>{isLoading ? 'Gerando...' : 'Gerar com IA'}</span>
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                />
            </div>
            
             <div>
                <label htmlFor="image-prompt" className="block text-sm font-medium text-gray-700 mb-1">
                    Ou, descreva a imagem para a IA
                </label>
                <textarea
                    id="image-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Descreva a imagem que você quer gerar..."
                    className="w-full p-2 border rounded-lg bg-gray-50 text-sm"
                    rows={2}
                    disabled={isLoading}
                />
            </div>

            {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
        </div>
    );
};

export default ImageUploader;