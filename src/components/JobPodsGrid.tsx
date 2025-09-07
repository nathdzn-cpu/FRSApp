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

  const podDocuments = documents.filter(doc => doc.type === 'pod' || doc.type === 'check_signature');

  if (podDocuments.length === 0) {
    return <p className="text-gray-600">No PODs or signatures uploaded for this job yet.</p>;
  }

  const getPlaceholderImage = (type: string) => {
    // In a real app, these would be actual image URLs from storage
    if (type === 'pod') return 'https://via.placeholder.com/150/ADD8E6/000000?text=POD';
    if (type === 'check_signature') return 'https://via.placeholder.com/150/90EE90/000000?text=Signature';
    return 'https://via.placeholder.com/150/D3D3D3/000000?text=Document';
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {podDocuments.map((doc) => (
          <div key={doc.id} className="relative group overflow-hidden rounded-lg shadow-sm border border-gray-200">
            <img
              src={getPlaceholderImage(doc.type)}
              alt={doc.type}
              className="w-full h-32 object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
              onClick={() => setSelectedImage(getPlaceholderImage(doc.type))}
            />
            <div className="p-2 bg-white text-center text-sm text-gray-700">
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
        <DialogContent className="max-w-3xl bg-white p-6 rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Document Viewer</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img src={selectedImage} alt="Selected Document" className="max-w-full h-auto mx-auto" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobPodsGrid;