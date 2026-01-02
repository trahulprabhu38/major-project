import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Folder,
  File,
  FolderPlus,
  Upload,
  Download,
  Trash2,
  ChevronRight,
  Home,
  FileText,
  Image,
  Archive,
  FileSpreadsheet,
  Eye,
  X,
} from 'lucide-react';
import { materialsAPI } from '../../services/api';
import { onMaterialUploaded, onMaterialDeleted, onFolderCreated, onFolderDeleted } from '../../services/socket';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

const CourseMaterials = ({ courseId, isTeacher }) => {
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Get file icon based on file type
  const getFileIcon = (fileType) => {
    if (!fileType) return File;
    const type = fileType.toLowerCase();
    if (type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif'].includes(type)) return Image;
    if (type.includes('spreadsheet') || ['.xlsx', '.xls', '.csv'].includes(type)) return FileSpreadsheet;
    if (['.zip', '.rar'].includes(type)) return Archive;
    return FileText;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Load materials and folders
  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const response = await materialsAPI.getMaterials(courseId, currentFolder?.id);
      setFolders(response.data.data.folders || []);
      setMaterials(response.data.data.materials || []);
    } catch (error) {
      console.error('Error loading materials:', error);
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  }, [courseId, currentFolder]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Socket event listeners
  useEffect(() => {
    const handleMaterialUploaded = (material) => {
      if (material.course_id === courseId) {
        loadMaterials();
        toast.success('New material uploaded');
      }
    };

    const handleMaterialDeleted = () => {
      loadMaterials();
    };

    const handleFolderCreated = (folder) => {
      if (folder.course_id === courseId) {
        loadMaterials();
      }
    };

    const handleFolderDeleted = () => {
      loadMaterials();
    };

    onMaterialUploaded(handleMaterialUploaded);
    onMaterialDeleted(handleMaterialDeleted);
    onFolderCreated(handleFolderCreated);
    onFolderDeleted(handleFolderDeleted);

    return () => {
      // Cleanup is handled in socket service
    };
  }, [courseId, loadMaterials]);

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name is required');
      return;
    }

    try {
      await materialsAPI.createFolder(courseId, {
        name: newFolderName,
        parentFolderId: currentFolder?.id || null,
      });
      toast.success('Folder created successfully');
      setNewFolderName('');
      setShowNewFolderDialog(false);
      loadMaterials();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(error.response?.data?.message || 'Failed to create folder');
    }
  };

  // Open folder
  const handleOpenFolder = (folder) => {
    setCurrentFolder(folder);
    setFolderPath([...folderPath, folder]);
  };

  // Navigate to folder in breadcrumb
  const handleNavigateToFolder = (index) => {
    if (index === -1) {
      // Go to root
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      const folder = folderPath[index];
      setCurrentFolder(folder);
      setFolderPath(folderPath.slice(0, index + 1));
    }
  };

  // Upload file
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (currentFolder?.id) {
      formData.append('folderId', currentFolder.id);
    }

    try {
      setUploading(true);
      await materialsAPI.uploadMaterial(courseId, formData);
      toast.success('File uploaded successfully');
      loadMaterials();
      event.target.value = ''; // Reset input
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Check if file is previewable
  const isPreviewable = (material) => {
    const previewableTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'text/plain'];
    return previewableTypes.includes(material.mime_type);
  };

  // Preview material
  const handlePreview = async (material) => {
    try {
      setLoadingPreview(true);
      setPreviewMaterial(material);
      const response = await materialsAPI.downloadMaterial(material.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: material.mime_type }));
      setPreviewUrl(url);
    } catch (error) {
      console.error('Error previewing material:', error);
      toast.error('Failed to preview file');
      setPreviewMaterial(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Close preview
  const handleClosePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewMaterial(null);
  };

  // Download material
  const handleDownload = async (material) => {
    try {
      const response = await materialsAPI.downloadMaterial(material.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', material.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading material:', error);
      toast.error('Failed to download file');
    }
  };

  // Delete material
  const handleDeleteMaterial = async (materialId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await materialsAPI.deleteMaterial(materialId);
      toast.success('File deleted successfully');
      loadMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error(error.response?.data?.message || 'Failed to delete file');
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId) => {
    if (!confirm('Are you sure you want to delete this folder? It must be empty.')) return;

    try {
      await materialsAPI.deleteFolder(folderId);
      toast.success('Folder deleted successfully');
      loadMaterials();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error(error.response?.data?.message || 'Failed to delete folder');
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-dark-text-secondary">
        <button
          onClick={() => handleNavigateToFolder(-1)}
          className="hover:text-neutral-900 dark:hover:text-dark-text-primary flex items-center gap-1"
        >
          <Home className="w-4 h-4" />
          Root
        </button>
        {folderPath.map((folder, index) => (
          <div key={folder.id} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            <button
              onClick={() => handleNavigateToFolder(index)}
              className="hover:text-neutral-900 dark:hover:text-dark-text-primary"
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      {isTeacher && (
        <div className="flex gap-2">
          <Button
            onClick={() => setShowNewFolderDialog(true)}
            className="bg-primary-500 hover:bg-primary-600 dark:bg-dark-green-500 dark:hover:bg-dark-green-600"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-primary-500 hover:bg-primary-600 dark:bg-dark-green-500 dark:hover:bg-dark-green-600"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </div>
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Create New Folder</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 px-3 py-2 border rounded-md dark:bg-dark-bg dark:border-dark-border"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <Button onClick={handleCreateFolder}>Create</Button>
              <Button variant="outline" onClick={() => {
                setShowNewFolderDialog(false);
                setNewFolderName('');
              }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Folders */}
      {folders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-dark-text-secondary">Folders</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {folders.map((folder) => (
              <motion.div
                key={folder.id}
                whileHover={{ scale: 1.02 }}
                className="relative group"
              >
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleOpenFolder(folder)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <Folder className="w-8 h-8 text-yellow-500" />
                    <span className="font-medium text-sm truncate">{folder.name}</span>
                  </CardContent>
                </Card>
                {isTeacher && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder.id);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Materials */}
      {materials.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-dark-text-secondary">Files</h3>
          <div className="space-y-2">
            {materials.map((material) => {
              const FileIcon = getFileIcon(material.file_type);
              return (
                <motion.div
                  key={material.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group"
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileIcon className="w-6 h-6 text-primary-500 dark:text-dark-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{material.original_name}</p>
                          <p className="text-xs text-neutral-500 dark:text-dark-text-secondary">
                            {formatFileSize(material.file_size)} • {new Date(material.upload_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPreviewable(material) && (
                          <button
                            onClick={() => handlePreview(material)}
                            className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/20 text-primary-600 dark:text-dark-green-500 rounded-md transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(material)}
                          className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-md transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {isTeacher && (
                          <button
                            onClick={() => handleDeleteMaterial(material.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : !loading && folders.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-neutral-500 dark:text-dark-text-secondary">
            <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No materials yet</p>
            {isTeacher && <p className="text-sm mt-1">Upload files or create folders to organize course materials</p>}
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-neutral-500 dark:text-dark-text-secondary">Loading materials...</p>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-6xl h-[90vh] bg-white dark:bg-dark-bg rounded-lg shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-dark-border">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{previewMaterial.original_name}</h3>
                <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">
                  {formatFileSize(previewMaterial.file_size)} • {previewMaterial.file_type}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  onClick={() => handleDownload(previewMaterial)}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <button
                  onClick={handleClosePreview}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-4">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                </div>
              ) : previewUrl ? (
                <>
                  {previewMaterial.mime_type === 'application/pdf' && (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full border-0 rounded"
                      title="PDF Preview"
                    />
                  )}
                  {previewMaterial.mime_type?.startsWith('image/') && (
                    <div className="flex items-center justify-center h-full">
                      <img
                        src={previewUrl}
                        alt={previewMaterial.original_name}
                        className="max-w-full max-h-full object-contain rounded"
                      />
                    </div>
                  )}
                  {previewMaterial.mime_type === 'text/plain' && (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full border-0 rounded bg-white dark:bg-dark-bg-secondary"
                      title="Text Preview"
                    />
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-500 dark:text-dark-text-secondary">
                  <p>Failed to load preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseMaterials;
