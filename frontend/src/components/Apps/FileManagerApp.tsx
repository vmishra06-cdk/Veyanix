import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setFiles, setCurrentPath, setSelectedFileId, addFileItem, removeFileItem } from '../../store/fileSystemSlice';
import { 
  Folder, FileCode, FileText, File, Upload, FolderPlus, FilePlus, 
  Trash2, Lock, Unlock, Eye, ArrowLeft, Clock, History, AlertTriangle, ShieldAlert
} from 'lucide-react';

export const FileManagerApp: React.FC = () => {
  const dispatch = useDispatch();
  const { files, currentPath, selectedFileId } = useSelector((state: RootState) => state.fileSystem);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [isReadingContent, setIsReadingContent] = useState(false);
  
  // Form parameters
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [encryptNewFile, setEncryptNewFile] = useState(false);
  
  const token = localStorage.getItem('veyanix_token');
  const headers = { 'Authorization': `Bearer ${token}` };

  // Fetch file list relative to current path on mount or path update
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/files?path=${encodeURIComponent(currentPath)}`, {
        headers
      });
      if (res.ok) {
        const data = await res.json();
        dispatch(setFiles(data));
      }
    } catch (e) {
      console.error("Error fetching files:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    setSelectedFileContent(null);
  }, [currentPath]);

  // Selected file details and version logs fetch
  const selectedFile = files.find(f => f.id === selectedFileId);
  
  useEffect(() => {
    if (selectedFileId && selectedFile && !selectedFile.is_directory) {
      fetchVersions();
      readFileContent();
    } else {
      setVersions([]);
      setSelectedFileContent(null);
    }
  }, [selectedFileId]);

  const fetchVersions = async () => {
    if (!selectedFileId) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/files/${selectedFileId}/versions`, { headers });
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const readFileContent = async () => {
    if (!selectedFileId) return;
    setIsReadingContent(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/files/download/${selectedFileId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.is_text) {
          setSelectedFileContent(data.content);
        } else {
          setSelectedFileContent("[Binary / Encrypted File - Cannot view inline]");
        }
      } else {
        setSelectedFileContent("[Decryption Error or Access Denied]");
      }
    } catch (e) {
      setSelectedFileContent("[Connection Failure]");
    } finally {
      setIsReadingContent(false);
    }
  };

  // Create virtual folder directory
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName) return;
    
    // Virtual full path
    const folderPath = currentPath === '/' ? `/${newFolderName}/` : `${currentPath}${newFolderName}/`;
    
    const formData = new FormData();
    formData.append('name', newFolderName);
    formData.append('path', folderPath);
    formData.append('is_directory', 'true');
    formData.append('is_encrypted', 'false');

    try {
      const res = await fetch('http://localhost:8000/api/v1/files/create', {
        method: 'POST',
        headers,
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        dispatch(addFileItem(data));
        setNewFolderName('');
        setShowFolderForm(false);
      } else {
        const err = await res.json();
        alert(err.detail || "Folder creation failed");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Physical file upload handler
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filePath = currentPath === '/' ? `/${file.name}` : `${currentPath}${file.name}`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', filePath);
    formData.append('is_encrypted', encryptNewFile.toString());
    formData.append('commit_message', `Uploaded ${file.name}`);

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/files/upload', {
        method: 'POST',
        headers,
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        dispatch(addFileItem(data));
      } else {
        const err = await res.json();
        alert(err.detail || "Upload failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Delete virtual file helper
  const handleDeleteFile = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/files/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        dispatch(removeFileItem(id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Restore file version checkpoint
  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedFileId) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/files/${selectedFileId}/restore/${versionId}`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        alert("File rolled back successfully!");
        fetchVersions();
        readFileContent();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Navigation handlers
  const handleFolderDoubleClick = (path: string) => {
    dispatch(setCurrentPath(path));
  };

  const handleGoBack = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = '/' + parts.join('/') + (parts.length > 0 ? '/' : '');
    dispatch(setCurrentPath(parentPath));
  };

  // Icon selector based on file extension
  const getFileIcon = (file: any) => {
    if (file.is_directory) return <Folder className="w-8 h-8 text-indigo-400 fill-indigo-400/10" />;
    const name = file.name.toLowerCase();
    if (name.endsWith('.py') || name.endsWith('.js') || name.endsWith('.cpp') || name.endsWith('.ts') || name.endsWith('.html') || name.endsWith('.css')) {
      return <FileCode className="w-8 h-8 text-emerald-400 fill-emerald-400/10" />;
    }
    if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.json')) {
      return <FileText className="w-8 h-8 text-blue-400 fill-blue-400/10" />;
    }
    return <File className="w-8 h-8 text-slate-400 fill-slate-400/10" />;
  };

  return (
    <div className="flex flex-1 overflow-hidden text-sm select-none font-sans h-full">
      {/* 1. Left Sidebar: Storage info & Shortcuts */}
      <div className="w-48 border-r border-slate-900 bg-slate-950/45 p-4 flex flex-col justify-between">
        <div>
          <h3 className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-3">Folders</h3>
          <ul className="space-y-1">
            <li>
              <button 
                onClick={() => dispatch(setCurrentPath('/'))}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 transition-colors ${
                  currentPath === '/' ? 'bg-indigo-950/50 text-indigo-300 font-semibold border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-900/30 hover:text-slate-200'
                }`}
              >
                <Folder className="w-4 h-4" />
                <span>Root (/)</span>
              </button>
            </li>
          </ul>
        </div>
        
        {/* Symmetric Encrypt warning banner */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5 text-indigo-400 mb-1 font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>Symmetric AES-256</span>
          </div>
          <span>Enabled files are encrypted before saving to physical block storage.</span>
        </div>
      </div>

      {/* 2. Main File List Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950/20">
        {/* Top controls menu */}
        <div className="p-3 border-b border-slate-900/80 bg-slate-950/25 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {currentPath !== '/' && (
              <button 
                onClick={handleGoBack}
                className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
                title="Go to parent directory"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="font-mono text-xs bg-slate-950/80 border border-slate-900 px-3 py-1.5 rounded-lg text-slate-300 max-w-xs truncate">
              {currentPath}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Create Folder button */}
            <button
              onClick={() => setShowFolderForm(!showFolderForm)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-200 rounded-lg flex items-center space-x-1.5 transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-indigo-400" />
              <span className="text-xs">New Folder</span>
            </button>

            {/* Upload File Input with Crypt option */}
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-850 pl-3 pr-1.5 py-1 rounded-lg">
              <label className="flex items-center space-x-1.5 text-xs text-slate-400 cursor-pointer" title="Enable AES-256 encryption on upload">
                <input 
                  type="checkbox" 
                  checked={encryptNewFile} 
                  onChange={(e) => setEncryptNewFile(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-500 focus:ring-indigo-500/20 bg-slate-950" 
                />
                <Lock className={`w-3.5 h-3.5 ${encryptNewFile ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>Encrypt</span>
              </label>
              
              <div className="h-4 w-[1px] bg-slate-800 mx-1" />
              
              <label className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs cursor-pointer flex items-center space-x-1 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
                <input 
                  type="file" 
                  onChange={handleUploadFile} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>
        </div>

        {/* Create Folder Form overlays */}
        {showFolderForm && (
          <form onSubmit={handleCreateFolder} className="p-3 bg-slate-900/50 border-b border-slate-850 flex items-center space-x-2 animate-fade-in">
            <input
              type="text"
              placeholder="Folder Name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/35"
              autoFocus
            />
            <button type="submit" className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold">
              Create
            </button>
            <button type="button" onClick={() => setShowFolderForm(false)} className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded text-xs">
              Cancel
            </button>
          </form>
        )}

        {/* Files Grid area */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <span className="animate-pulse">Loading directory metadata...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Folder className="w-16 h-16 stroke-[1.2] mb-2 opacity-30" />
            <span className="text-xs">Workspace directory is empty</span>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 content-start">
            {files.map((file) => {
              const isSelected = selectedFileId === file.id;
              return (
                <div
                  key={file.id}
                  onClick={() => dispatch(setSelectedFileId(file.id))}
                  onDoubleClick={() => file.is_directory ? handleFolderDoubleClick(file.path) : null}
                  className={`flex flex-col items-center p-3 rounded-xl border cursor-pointer select-none transition-all duration-200 group relative ${
                    isSelected 
                      ? 'bg-indigo-950/25 border-indigo-500/40 shadow-indigo-500/5' 
                      : 'bg-slate-950/15 border-slate-900 hover:bg-slate-900/25 hover:border-slate-850'
                  }`}
                >
                  {/* File Lock symbol */}
                  {file.is_encrypted && (
                    <div className="absolute top-2 right-2 p-0.5 bg-indigo-950 border border-indigo-500/20 text-indigo-400 rounded" title="AES-256 Encrypted">
                      <Lock className="w-3 h-3" />
                    </div>
                  )}

                  {getFileIcon(file)}
                  
                  <span className="mt-2 text-xs text-slate-200 font-medium text-center truncate max-w-full group-hover:text-white" title={file.name}>
                    {file.name}
                  </span>
                  
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {file.is_directory ? 'Folder' : `${(file.size / 1024).toFixed(1)} KB`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Right Sidebar: Metadata & Versioning */}
      {selectedFile && (
        <div className="w-64 border-l border-slate-900 bg-slate-950/45 p-4 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-900 pb-2">
              <h3 className="text-slate-400 font-semibold text-xs tracking-wider uppercase">Details</h3>
              <button 
                onClick={() => handleDeleteFile(selectedFile.id)}
                className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                title="Delete File"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata tags */}
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide">Name</label>
                <div className="text-xs font-semibold text-slate-200 truncate">{selectedFile.name}</div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide">Virtual Path</label>
                <div className="text-xs font-mono text-slate-300 truncate">{selectedFile.path}</div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide">Crypt Status</label>
                <div className="flex items-center space-x-1.5 text-xs mt-0.5">
                  {selectedFile.is_encrypted ? (
                    <span className="text-indigo-400 bg-indigo-950/50 border border-indigo-500/20 px-2 py-0.5 rounded flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>AES-256 Encrypted</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded flex items-center space-x-1">
                      <Unlock className="w-3 h-3" />
                      <span>Plaintext</span>
                    </span>
                  )}
                </div>
              </div>
              
              {!selectedFile.is_directory && (
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wide">Content Preview</label>
                  <div className="mt-1 bg-slate-950 border border-slate-900 rounded-lg p-2 max-h-32 overflow-y-auto font-mono text-[10px] text-slate-400 leading-tight">
                    {isReadingContent ? (
                      <span className="animate-pulse">Decrypting content stream...</span>
                    ) : selectedFileContent ? (
                      <pre className="whitespace-pre-wrap">{selectedFileContent}</pre>
                    ) : (
                      <span className="italic opacity-40">No content available</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Version log timeline */}
            {!selectedFile.is_directory && (
              <div>
                <div className="flex items-center space-x-1 text-slate-400 font-semibold text-xs tracking-wider uppercase mb-3 border-b border-slate-900 pb-2">
                  <History className="w-3.5 h-3.5" />
                  <span>Version History</span>
                </div>
                
                {versions.length === 0 ? (
                  <div className="text-xs italic text-slate-500">No commits found</div>
                ) : (
                  <div className="relative border-l border-slate-800 pl-3 ml-1.5 space-y-4 max-h-56 overflow-y-auto">
                    {versions.map((ver, idx) => (
                      <div key={ver.id} className="relative text-xs">
                        {/* Dot indicator */}
                        <span className={`absolute -left-[17px] top-1.5 w-2 h-2 rounded-full border ${
                          idx === 0 ? 'bg-indigo-400 border-indigo-400 shadow-glow' : 'bg-slate-900 border-slate-700'
                        }`} />
                        
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">v{ver.version_number}</span>
                          <span className="text-[9px] text-slate-500">
                            {new Date(ver.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] leading-snug mt-0.5">{ver.commit_message}</div>
                        
                        {/* Restore trigger */}
                        {idx !== 0 && (
                          <button
                            onClick={() => handleRestoreVersion(ver.id)}
                            className="mt-1 text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold uppercase flex items-center space-x-1"
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>Restore to v{ver.version_number}</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="text-[10px] text-slate-500 mt-4 font-mono">
            ID: {selectedFile.id.slice(0, 8)}...
          </div>
        </div>
      )}
    </div>
  );
};
