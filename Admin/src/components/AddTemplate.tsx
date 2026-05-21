import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminSidebarNavContent } from './AdminSidebarNav';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string;
  is_active: boolean;
  sort_order: number;
}

const AddTemplate: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAdminAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [formData, setFormData] = useState({
    templateName: '',
    category: '',
    description: '',
    format: 'png',
    size: '1:1',
    publishAt: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const response = await api.getCategories();
      
      console.log('Categories API response:', response); // Debug log
      
      // Handle different response formats
      let categoriesData: Category[] = [];
      
      if (response.success && response.data) {
        categoriesData = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        categoriesData = response;
      } else if (response.data && Array.isArray(response.data)) {
        categoriesData = response.data;
      }
      
      // Filter only active categories and sort by sort_order
      const activeCategories = categoriesData
        .filter((cat: Category) => cat.is_active !== false)
        .sort((a: Category, b: Category) => {
          // Sort by sort_order if available, otherwise by name
          if (a.sort_order !== undefined && b.sort_order !== undefined) {
            return a.sort_order - b.sort_order;
          }
          return a.name.localeCompare(b.name);
        });
      
      console.log('Active categories:', activeCategories); // Debug log
      setCategories(activeCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Show user-friendly error message
      console.error('Full error details:', error);
      // Fallback to empty array on error - user can still add categories
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const toIsoFromDatetimeLocal = (value: string): string | null => {
    const s = value.trim();
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    if (!formData.templateName || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);

      const publishAtIso = toIsoFromDatetimeLocal(formData.publishAt);
      if (formData.publishAt.trim() && !publishAtIso) {
        alert('Please pick a valid publish date/time.');
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('file', selectedFile);
      formDataToSend.append('name', formData.templateName);
      formDataToSend.append('category_slug', formData.category);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('file_format', formData.format);
      formDataToSend.append('aspect_ratio', formData.size);
      if (publishAtIso) {
        formDataToSend.append('publish_at', publishAtIso);
      }

      const data = await api.createTemplate(formDataToSend);

      if (data.success) {
        alert('Template created successfully!');
        navigate('/templates');
      } else {
        throw new Error(data.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert(error instanceof Error ? error.message : 'Failed to create template. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`flex flex-col w-72 max-w-[85vw] bg-white dark:bg-[#111418] border-r border-gray-200 dark:border-[#29303b] shrink-0 transition-all z-40
          fixed md:static inset-y-0 left-0 h-full
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <AdminSidebarNavContent theme="console" onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
        {/* TopNavBar */}
        <header className="flex items-center justify-between shrink-0 h-16 px-6 md:px-10 bg-white dark:bg-[#111418] border-b border-gray-200 dark:border-[#29303b] z-20">
          {/* Mobile Menu Button (Visible only on small screens) */}
          <button 
            className="md:hidden p-2 text-gray-600 dark:text-gray-300"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          {/* Search Bar (Global) */}
          <div className="hidden md:flex flex-1 max-w-lg items-center gap-4">
            <div className="relative w-full max-w-sm">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input 
                className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary focus:border-primary dark:bg-[#1c242e] dark:border-[#29303b] dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary dark:focus:border-primary transition-all" 
                placeholder="Search entire platform..." 
                type="text"
              />
            </div>
          </div>
          {/* Right Actions */}
          <div className="flex items-center gap-4 md:gap-6 ml-auto">
            <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </button>
            <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700"></div>
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Alex Morgan</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Super Admin</p>
              </div>
              <div 
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 ring-2 ring-gray-100 dark:ring-gray-700" 
                data-alt="User profile photo avatar" 
                style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDmcR-aOkyfl3VSc1N2AiLe1MQj5MbXlAfUzEjSN3JNGCC6icO7VZHNqMJJByJ_LyRpEJ1Unui7jNicoxH1PbE97BW4WyrL2t3lb-uPCDBnyYTXpK21wIth1lrs8zUh4Jdc8Un5zKJzx2FbWKwHVwza7Lye54fqvckgE5GKWc1xHY7BbPyuAAvYEYuqkh10Aji-wsXVZogzETTT7OK3oTB1rW6zrGVQxSlYpnTU-3g6OQJsVl-0yoL9lZDferszahF53l1_xjQNF0I")'}}
              ></div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6 md:p-10">
          <div className="max-w-4xl mx-auto flex flex-col gap-8">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#9fa6ad]">
              <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <Link to="/templates" className="hover:text-primary transition-colors">Template Library</Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-gray-900 dark:text-white font-medium">Add New Template</span>
            </div>

            {/* Page Heading */}
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Create New Template</h2>
              <p className="text-gray-500 dark:text-[#9fa6ad]">Fill in the details below to add a new design template to the library.</p>
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-[#1c242e] rounded-xl border border-gray-200 dark:border-[#29303b] shadow-sm">
              <form className="p-6 md:p-8 flex flex-col gap-8" onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div className="flex flex-col gap-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-[#29303b] pb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="template-name">Template Name</label>
                      <input 
                        className="w-full rounded-lg border-gray-300 bg-white dark:bg-[#11161d] dark:border-[#29303b] text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary text-sm p-2.5" 
                        id="template-name" 
                        name="templateName"
                        placeholder="e.g. Diwali Festival Banner 2024" 
                        type="text"
                        value={formData.templateName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="category">Category</label>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => navigate('/templates/categories')}
                            className="text-xs text-primary hover:text-blue-600 flex items-center gap-1 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            <span>Add New Category</span>
                          </button>
                        )}
                      </div>
                      <select 
                        className="w-full rounded-lg border-gray-300 bg-white dark:bg-[#11161d] dark:border-[#29303b] text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary text-sm p-2.5" 
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        disabled={isLoadingCategories}
                      >
                        <option disabled value="">
                          {isLoadingCategories ? 'Loading categories...' : categories.length === 0 ? 'No categories available' : 'Select a category'}
                        </option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.slug}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {categories.length === 0 && !isLoadingCategories && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          No categories found.
                          {isAdmin ? (
                            <>
                              {' '}
                              <button
                                type="button"
                                onClick={() => navigate('/templates/categories')}
                                className="text-primary hover:text-blue-600 underline"
                              >
                                Create one here
                              </button>
                            </>
                          ) : (
                            <span> Ask an admin to add categories.</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="description">
                      Description <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <textarea 
                      className="w-full rounded-lg border-gray-300 bg-white dark:bg-[#11161d] dark:border-[#29303b] text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary text-sm p-2.5" 
                      id="description" 
                      name="description"
                      placeholder="Briefly describe the purpose of this template..." 
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="publishAt">
                      Schedule publish <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      className="w-full rounded-lg border-gray-300 bg-white dark:bg-[#11161d] dark:border-[#29303b] text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary text-sm p-2.5"
                      id="publishAt"
                      name="publishAt"
                      placeholder="YYYY-MM-DDThh:mm"
                      type="datetime-local"
                      value={formData.publishAt}
                      onChange={handleInputChange}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Leave blank to keep the template as Draft. Time is in your browser’s local timezone.
                    </p>
                  </div>
                </div>

                {/* Specifications */}
                <div className="flex flex-col gap-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-[#29303b] pb-3">Specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* File Format */}
                    <div className="flex flex-col gap-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">File Format</span>
                      <div className="flex gap-4">
                        <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 w-full transition-all ${
                          formData.format === 'png' 
                            ? 'border-primary bg-blue-50 dark:bg-blue-900/10 text-primary' 
                            : 'border-gray-200 dark:border-[#29303b]'
                        }`}>
                          <input 
                            className="h-4 w-4 border-gray-300 text-primary focus:ring-primary" 
                            name="format" 
                            type="radio" 
                            value="png"
                            checked={formData.format === 'png'}
                            onChange={() => handleRadioChange('format', 'png')}
                          />
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">image</span>
                            <span className="font-medium text-sm">PNG Image</span>
                          </div>
                        </label>
                        <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 w-full transition-all ${
                          formData.format === 'mp4' 
                            ? 'border-primary bg-blue-50 dark:bg-blue-900/10 text-primary' 
                            : 'border-gray-200 dark:border-[#29303b]'
                        }`}>
                          <input 
                            className="h-4 w-4 border-gray-300 text-primary focus:ring-primary" 
                            name="format" 
                            type="radio" 
                            value="mp4"
                            checked={formData.format === 'mp4'}
                            onChange={() => handleRadioChange('format', 'mp4')}
                          />
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">movie</span>
                            <span className="font-medium text-sm">MP4 Video</span>
                          </div>
                        </label>
                      </div>
                    </div>
                    {/* Aspect Ratio */}
                    <div className="flex flex-col gap-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Aspect Ratio</span>
                      <div className="flex gap-4">
                        <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 w-full transition-all ${
                          formData.size === '1:1' 
                            ? 'border-primary bg-blue-50 dark:bg-blue-900/10 text-primary' 
                            : 'border-gray-200 dark:border-[#29303b]'
                        }`}>
                          <input 
                            className="h-4 w-4 border-gray-300 text-primary focus:ring-primary" 
                            name="size" 
                            type="radio" 
                            value="1:1"
                            checked={formData.size === '1:1'}
                            onChange={() => handleRadioChange('size', '1:1')}
                          />
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">crop_square</span>
                            <span className="font-medium text-sm">Square (1:1)</span>
                          </div>
                        </label>
                        <label className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 w-full transition-all ${
                          formData.size === '9:16' 
                            ? 'border-primary bg-blue-50 dark:bg-blue-900/10 text-primary' 
                            : 'border-gray-200 dark:border-[#29303b]'
                        }`}>
                          <input 
                            className="h-4 w-4 border-gray-300 text-primary focus:ring-primary" 
                            name="size" 
                            type="radio" 
                            value="9:16"
                            checked={formData.size === '9:16'}
                            onChange={() => handleRadioChange('size', '9:16')}
                          />
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">smartphone</span>
                            <span className="font-medium text-sm">Portrait (9:16)</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload File */}
                <div className="flex flex-col gap-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-[#29303b] pb-3">Upload File</h3>
                  {filePreview ? (
                    <div className="relative rounded-xl border-2 border-gray-300 dark:border-gray-600 overflow-hidden">
                      <div className="relative h-64 w-full bg-gray-100 dark:bg-gray-800">
                        <img 
                          src={filePreview} 
                          alt="Preview" 
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setFilePreview(null);
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </div>
                      {selectedFile && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">File:</span> {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label 
                      htmlFor="file-upload"
                      className="flex justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 px-6 py-10 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer group"
                    >
                      <div className="text-center">
                        <div className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500 group-hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[48px]">cloud_upload</span>
                        </div>
                        <div className="mt-4 flex flex-col gap-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                          <span className="font-semibold text-primary group-hover:text-blue-500">Click to upload a file</span>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs leading-5 text-gray-500 dark:text-gray-500 mt-2">PNG, JPG, GIF, MP4 up to 10MB</p>
                      </div>
                      <input 
                        className="sr-only" 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        accept="image/*,video/*" 
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                  {isSubmitting && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span>Uploading template...</span>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#29303b]">
                  <button 
                    type="button"
                    onClick={() => navigate('/templates')}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || !selectedFile}
                    className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">save</span>
                        <span>Save Template</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddTemplate;

