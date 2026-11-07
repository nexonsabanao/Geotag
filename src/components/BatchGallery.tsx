import React, { useRef } from 'react';
import { Plus, Trash2, CheckCircle2, Image as ImageIcon, MapPin } from 'lucide-react';
import { PhotoItem } from '../types';

interface BatchGalleryProps {
  photos: PhotoItem[];
  activeId: string;
  onSelectPhoto: (id: string) => void;
  onDeletePhoto: (id: string) => void;
  onAddPhotos: (files: FileList | File[]) => void;
}

export const BatchGallery: React.FC<BatchGalleryProps> = ({
  photos,
  activeId,
  onSelectPhoto,
  onDeletePhoto,
  onAddPhotos,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddPhotos(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-18 bg-white border-t border-slate-200 px-3 sm:px-4 flex items-center gap-2 sm:gap-3 overflow-x-auto select-none z-10 no-scrollbar">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Add new photo button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="h-13 w-20 sm:w-22 flex-shrink-0 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-emerald-700 transition group"
        title="Upload more photos"
        aria-label="Upload additional photos"
      >
        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-medium">Add Photo</span>
      </button>

      {/* Thumbnails */}
      {photos.map((photo) => {
        const isActive = photo.id === activeId;
        return (
          <div
            key={photo.id}
            onClick={() => onSelectPhoto(photo.id)}
            className={`h-13 w-24 sm:w-26 flex-shrink-0 rounded-lg overflow-hidden relative border cursor-pointer group transition-all ${
              isActive
                ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs'
                : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100 bg-slate-100'
            }`}
          >
            <img
              src={photo.previewUrl}
              alt={photo.name}
              className="w-full h-full object-cover"
            />

            {/* Gradient caption overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-1 flex items-center justify-between">
              <span className="text-[9px] text-white truncate font-medium max-w-[65px]">
                {photo.data.title.split(',')[0]}
              </span>
              {photo.detectedFromExif && (
                <span title="GPS auto-detected from EXIF">
                  <MapPin className="w-2.5 h-2.5 text-emerald-300 flex-shrink-0" />
                </span>
              )}
            </div>

            {/* Delete button (visible on hover) */}
            {photos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePhoto(photo.id);
                }}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:text-red-300 opacity-0 group-hover:opacity-100 transition"
                title="Remove photo"
                aria-label={`Remove photo ${photo.name}`}
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
