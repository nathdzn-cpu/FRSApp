import React, { useState } from 'react';
import { Document, Job } from '@/types'; // Import Job
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Image, Download } from 'lucide-react';

interface JobPodsGridProps {
  documents: Document[];
  job: Job; // Added job prop
}

const JobPodsGrid: React.FC<JobPodsGridProps> = ({ documents, job }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Combine existing documents with the captured signature if available
  const allPodDocuments: Document[] = [];

  // Add captured signature as a synthetic document
  if (job.pod_signature_path) {
    allPodDocuments.push({
      id: `signature-${job.id}`,
      org_id: job.org_id,
      job_id: job.id,
      type: 'signature',
      storage_path: job.pod_signature_path,
      uploaded_by: job.assigned_driver_id || 'unknown', // Assuming driver signed
      created_at: job.last_status_update_at || new Date().toISOString(),
      signature_name: job.pod_signature_name || 'Recipient Signature',
    });
  }

  // Filter and add other POD-related documents
  documents.filter(doc => doc.type === 'pod' || doc.type === 'check_signature' || doc.type === 'document_uploaded')
           .forEach(doc => allPodDocuments.push(doc));

  if (allPodDocuments.length === 0) {
    return <p className="text-gray-600">No PODs or images uploaded for this job yet.</p>;
  }

  const getDisplayImageSrc = (doc: Document) => {
    if (doc.type === 'signature') {
      return doc.storage_path; // Use the actual URL for signatures
    }
    // For other document types, use placeholders or actual paths if available
    // In a real app, these would be actual image URLs from storage
    if (doc.type === 'pod') return 'https://via.placeholder.com/150/ADD8E6/000000?text=POD';
    if (doc.type === 'check_signature') return 'https://via.placeholder.com/150/90EE90/000000?text=Signature';
    if (doc.type === 'document_uploaded') return 'https://via.placeholder.com/150/D3D3D3/000000?text=Image';
    return 'https://via.placeholder.com/150/D3D3D3/000000?text=Document';
  };

  const getDisplayName = (doc: Document) => {
    if (doc.type === 'signature') {
      return `Signature: ${doc.signature_name}`;
    }
    return doc.type.replace(/_/g, ' ');
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {allPodDocuments.map((doc) => (
          <div key={doc.id} className="relative group overflow-hidden rounded-lg shadow-sm bg-[var(--saas-card-bg)]">
            <img
              src={getDisplayImageSrc(doc)}
              alt={getDisplayName(doc)}
              className="w-full h-32 object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
              onClick={() => setSelectedImage(getDisplayImageSrc(doc))}
            />
            <div className="p-2 bg-[var(--saas-card-bg)] text-center text-sm text-gray-700">
              <span className="capitalize">{getDisplayName(doc)}</span>
            </div>
            <a
              href={getDisplayImageSrc(doc)}
              download={doc.type === 'signature' ? `signature-${job.order_number}.png` : undefined}
              target="_blank" // Open in new tab for direct image view
              rel="noopener noreferrer"
              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="flex flex-col">
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