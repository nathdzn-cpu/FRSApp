import React, { useState } from 'react';
import { Document } from '@/utils/mockData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Image, Download } from 'lucide-react';

interface JobPodsGridProps {
  documents: Document[];
}

const JobPodsGrid: React.FC<JobPodsGridProps> = ({ documents }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const podDocuments = documents.filter(doc => doc.type === 'pod' || doc.type === 'check_signature' || doc.type === 'document_uploaded'); // Include document_uploaded

  if (podDocuments.length === 0) {
    return <p className="text-gray-600">No PODs or images uploaded for this job yet.</p>;
  }

  const getPlaceholderImage = (type: string) => {
    // In a real app, these would be actual image URLs from storage
    if (type === 'pod') return 'https://via.placeholder.com/150/ADD8E6/000000?text=POD';
    if (type === 'check_signature') return 'https://via.placeholder.com/150/90EE90/000000?text=Signature';
    if (type === 'document_uploaded') return 'https://via.placeholder.com/150/D3D3D3/000000?text=Image'; // Placeholder for generic images
    return 'https://via.placeholder.com/150/D3D3D3/000000?text=Document';
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {podDocuments.map((doc) => (
          <div key={doc.id} className="relative group overflow-hidden rounded-lg shadow-sm bg-[var(--saas-card-bg)]"> {/* Removed border */}
            <img
              src={getPlaceholderImage(doc.type)}
              alt={doc.type}
              className="w-full h-32 object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
              onClick={() => setSelectedImage(getPlaceholderImage(doc.type))}
            />
            <div className="p-2 bg-[var(--saas-card-bg)] text-center text-sm text-gray-700">
              <span className="capitalize">{doc.type.replace(/_/g, ' ')}</span>
            </div>
            <a
              href={getPlaceholderImage(doc.type)}
              download
              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl bg-[var(--saas-card-bg)] p-6 rounded-xl shadow-lg flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Document Viewer</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
            {selectedImage && (
              <img src={selectedImage} alt="Selected Document" className="max-w-full h-auto" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobPodsGrid;