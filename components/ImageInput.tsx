import React, { useRef } from 'react';
import { Camera, Upload, X, CheckCircle2 } from 'lucide-react';
import { fileToBase64 } from '../utils/fileUtils';
import { ImageFile } from '../types';

interface ImageInputProps {
  label: string;
  image: ImageFile | null;
  onImageSelected: (image: ImageFile | null) => void;
  color: "blue" | "emerald";
}

export const ImageInput: React.FC<ImageInputProps> = ({ label, image, onImageSelected, color }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        const previewUrl = URL.createObjectURL(file);
        
        onImageSelected({
          id: Date.now().toString(),
          base64,
          mimeType: file.type,
          previewUrl
        });
      } catch (error) {
        console.error("Error reading file", error);
        alert("Erro ao processar imagem.");
      }
    }
  };

  const clearImage = () => {
    if (image?.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }
    onImageSelected(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const borderColor = color === 'blue' ? 'border-blue-400' : 'border-emerald-400';
  const bgColor = color === 'blue' ? 'bg-blue-50' : 'bg-emerald-50';
  const buttonColor = color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700';

  return (
    <div className={`flex flex-col gap-2 p-4 rounded-xl border-2 border-dashed ${image ? 'border-solid border-gray-300 bg-white' : borderColor} ${!image ? bgColor : ''} transition-all`}>
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-semibold text-gray-700">{label}</h3>
        {image && <CheckCircle2 className="w-5 h-5 text-green-500" />}
      </div>

      {image ? (
        <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden group">
          <img 
            src={image.previewUrl} 
            alt="Preview" 
            className="w-full h-full object-cover"
          />
          <button 
            onClick={clearImage}
            className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <div className="mb-4 p-3 bg-white rounded-full shadow-sm">
            <Camera className={`w-8 h-8 ${color === 'blue' ? 'text-blue-500' : 'text-emerald-500'}`} />
          </div>
          <p className="text-sm text-gray-500 mb-4">Tire uma foto ou faça upload da tabela nutricional</p>
          
          <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-2 px-4 py-2 ${buttonColor} text-white rounded-lg font-medium shadow-sm active:scale-95 transition-transform`}
          >
            <Camera className="w-4 h-4" />
            <span>Adicionar Foto</span>
          </button>
        </div>
      )}
    </div>
  );
};