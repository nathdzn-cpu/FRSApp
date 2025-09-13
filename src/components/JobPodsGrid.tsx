import React, { useState } from 'react';
import { Document, Job } from '@/utils/mockData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Image, Download, Edit } from 'lucide-react';

interface JobPodsGridProps {
  documents: Document[];
  job?: Job | null; // Make job optional for backward compatibility
}

const JobPodsGrid: React.FC<JobPodsGridProps> = ({ documents, job }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const podDocuments = documents.filter(doc => doc.type === 'pod' || doc.type === 'check_signature' || doc.type === 'document_uploaded');

  if (podDocuments.length === 0) {
    return <p className="text-gray-600">No PODs or images uploaded for this job yet.</p>;
  }

  const getDocumentTitle = (doc: Document) => {
    if (doc.type === 'check_signature') {
      return `Signature: ${job?.pod_signature_name || 'Captured'}`;
    }
    if (doc.type === 'pod') {
      return 'POD';
    }
    return 'Image';
  };

  const getDocumentIcon = (doc: Document) => {
    if (doc.type === 'check_signature') {
      return <Edit className="h-8 w-8 text-gray-500" />;
    }
    // For PODs and other images, we'll show the image itself.
    // A generic icon can be a fallback.
    return <Image className="h-8 w-8 text-gray-500" />;
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {podDocuments.map((doc) => (
          <div key={doc.id} className="relative group overflow-hidden rounded-lg shadow-sm bg-gray-50">
            <div
              className="w-full h-32 bg-gray-200 flex items-center justify-center cursor-pointer"
              onClick={() => setSelectedImage(doc.storage_path)}
            >
              <img
                src={doc.storage_path}
                alt={doc.type}
                className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  // In case of image error, show an icon
                  e.currentTarget.style.display = 'none';
                  const iconContainer = e.currentTarget.nextElementSibling as HTMLElement;
                  if (iconContainer) iconContainer.style.display = 'flex';
                }}
              />
              <div className="hidden absolute inset-0 items-center justify-center">
                {getDocumentIcon(doc)}
              </div>
            </div>
            <div className="p-2 bg-white text-center text-sm text-gray-700">
              <span className="capitalize font-medium">{getDocumentTitle(doc)}</span>
            </div>
            <a
              href={doc.storage_path}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl w-full h-[90vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Document Viewer</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100 rounded-md">
            {selectedImage && (
              <img src={selectedImage} alt="Selected Document" className="max-w-full max-h-full object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobPodsGrid;