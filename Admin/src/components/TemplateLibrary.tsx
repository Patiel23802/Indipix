import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminSidebarNavContent } from './AdminSidebarNav';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  icon?: string | null;
  color?: string;
}

interface Template {
  id: string;
  name: string;
  category_id?: string;
  category_slug?: string;
  category_name?: string;
  category_icon?: string | null;
  category_color?: string;
  description: string | null;
  file_format: string;
  aspect_ratio: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  /** Set by admin API: who uploaded the template */
  created_by_name?: string | null;
}

// Component for template thumbnail with fallback
const TemplateThumbnail: React.FC<{
  fileUrl: string;
  alt: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  getCategoryGradient: (category: string, color: string) => string;
}> = ({ fileUrl, alt, categoryName, categoryColor, categoryIcon, getCategoryGradient }) => {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div 
        className="absolute inset-0 transition-transform duration-500 group-hover:scale-105 flex items-center justify-center" 
        style={{
          background: getCategoryGradient(categoryName, categoryColor)
        }}
      >
        <span className="material-symbols-outlined text-white/30 text-6xl">
          {categoryIcon}
        </span>
      </div>
    );
  }

  return (
    <img 
      src={fileUrl}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setImageError(true)}
    />
  );
};

function templateIsVideo(t: Template): boolean {
  const fmt = String(t.file_format || '').toLowerCase();
  if (fmt === 'mp4' || fmt === 'video' || fmt.includes('mp4')) return true;
  const path = String(t.file_url || t.file_name || '').toLowerCase();
  return path.endsWith('.mp4') || path.includes('.mp4');
}

const TemplateLibrary: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, user } = useAdminAuth();
  /** Designer: no ⋮ menu (preview via link / thumbnail still available). Creative Head & admin: full menu. */
  const showTemplateKebabMenu = user?.role !== 'designer';
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // null = show categories, string = show templates for that category
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuTemplateId, setOpenMenuTemplateId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchCategories();
    // Don't fetch templates initially - show categories first
  }, []);

  useEffect(() => {
    // Only fetch templates when a category is selected
    if (selectedCategory) {
      fetchTemplates();
    }
  }, [selectedCategory, selectedStatus, searchQuery]);

  useEffect(() => {
    if (!openMenuTemplateId) return;
    const closeMenu = () => setOpenMenuTemplateId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [openMenuTemplateId]);

  useEffect(() => {
    if (!previewTemplate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewTemplate(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [previewTemplate]);

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const response = await api.getCategories();
      
      // Handle different response formats
      let categoriesData: Category[] = [];
      
      if (response.success && response.data) {
        categoriesData = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        categoriesData = response;
      } else if (response.data && Array.isArray(response.data)) {
        categoriesData = response.data;
      }
      
      // Filter only active categories and sort by name
      const activeCategories = categoriesData
        .filter((cat: Category) => cat.is_active)
        .sort((a: Category, b: Category) => a.name.localeCompare(b.name));
      
      setCategories(activeCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to empty array on error
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      setError(null);

      const params: { category?: string; status?: string; search?: string } = {};
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      if (selectedStatus !== 'all') {
        params.status = selectedStatus.toLowerCase();
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await api.getTemplates(params);
      
      let templatesData: Template[] = [];
      
      if (response.success && response.data) {
        templatesData = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        templatesData = response;
      } else if (response.data && Array.isArray(response.data)) {
        templatesData = response.data;
      }
      
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError(error instanceof Error ? error.message : 'Failed to load templates');
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleUpdateStatus = async (templateId: string, status: string) => {
    try {
      setUpdatingId(templateId);
      await api.updateTemplate(templateId, { status });
      setOpenMenuTemplateId(null);
      await fetchTemplates();
    } catch (err) {
      console.error('Update template status error:', err);
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      setUpdatingId(templateId);
      await api.deleteTemplate(templateId);
      setOpenMenuTemplateId(null);
      await fetchTemplates();
    } catch (err) {
      console.error('Delete template error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setUpdatingId(null);
    }
  };

  const getFileUrl = (fileUrl: string) => {
    // If file_url already starts with http, return as is
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    // Keep uploads URL correct even if API URL includes /api suffix.
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const staticBaseUrl = apiBaseUrl.replace(/\/api$/, '');
    return `${staticBaseUrl}${fileUrl}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
  };

  const getStatusBadgeClass = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'active') {
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    } else if (statusLower === 'draft') {
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
    } else if (statusLower === 'archived') {
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    }
    return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
  };

  const getCategoryBadgeClass = (color: string) => {
    const classes = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
      orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
      gray: 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'
    };
    return classes[color as keyof typeof classes] || classes.blue;
  };

  const getCategoryGradient = (category: string, iconColor: string) => {
    // Return gradient backgrounds based on category
    const gradients: { [key: string]: string } = {
      'Festival Banners': 'linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffd23f 100%)', // Orange/yellow festival colors
      'Birthday Wishes': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)', // Pink/purple birthday colors
      'Political Banners': 'linear-gradient(135deg, #c92a2a 0%, #e03131 50%, #ff6b6b 100%)', // Red political colors
      'Sales & Promotions': 'linear-gradient(135deg, #ffd93d 0%, #ff6b6b 50%, #ff8e53 100%)', // Yellow/orange/red sale colors
      'Wedding Invitations': 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 50%, #f1aeb5 100%)', // Pink/rose wedding colors
      'Corporate Events': 'linear-gradient(135deg, #4dabf7 0%, #339af0 50%, #228be6 100%)', // Blue corporate colors
      'Announcements': 'linear-gradient(135deg, #845ef7 0%, #7048e8 50%, #5f3dc4 100%)', // Purple announcement colors
      'Social Media Posts': 'linear-gradient(135deg, #339af0 0%, #228be6 50%, #1c7ed6 100%)' // Blue social media colors
    };
    
    return gradients[category] || `linear-gradient(135deg, var(--color-${iconColor}-400), var(--color-${iconColor}-600))`;
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
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#9fa6ad]">
              {isAdmin ? (
                <Link to="/" className="hover:text-primary transition-colors">
                  Dashboard
                </Link>
              ) : (
                <Link to="/templates" className="hover:text-primary transition-colors">
                  Templates
                </Link>
              )}
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-gray-900 dark:text-white font-medium">Template Library</span>
            </div>

            {/* Page Heading & Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Template Library</h2>
                <p className="text-gray-500 dark:text-[#9fa6ad]">Manage, edit, and publish your application content templates.</p>
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigate('/templates/categories')}
                    className="flex items-center justify-center gap-2 bg-white dark:bg-[#1c242e] border border-gray-300 dark:border-[#29303b] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg font-medium transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">category</span>
                    <span>Manage Categories</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/templates/new')}
                  className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span>Add New Template</span>
                </button>
              </div>
            </div>

            {/* Show Categories First, Then Templates */}
            {!selectedCategory ? (
              /* Categories Grid */
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Select a Category</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Choose a category to view its templates</p>
                </div>
                {isLoadingCategories ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      <p className="text-gray-500 dark:text-gray-400">Loading categories...</p>
                    </div>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <span className="material-symbols-outlined text-6xl text-gray-400">category</span>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No categories found</p>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => navigate('/templates/categories')}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Create Category
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.slug)}
                        className="group flex flex-col bg-white dark:bg-[#1c242e] rounded-xl border border-gray-200 dark:border-[#29303b] overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer p-6 text-left"
                      >
                        <div className="relative h-32 w-full overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
                          <div 
                            className="absolute inset-0 transition-transform duration-500 group-hover:scale-105 flex items-center justify-center" 
                            style={{
                              background: getCategoryGradient(category.name, category.color || 'blue')
                            }}
                          >
                            <span className="material-symbols-outlined text-white/30 text-5xl">
                              {category.icon || 'folder'}
                            </span>
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors mb-2">
                          {category.name}
                        </h3>
                        {category.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                            {category.description}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${getCategoryBadgeClass(category.color || 'blue')} text-xs font-medium`}>
                            <span className="material-symbols-outlined text-[14px]">{category.icon || 'folder'}</span>
                            View Templates
                          </span>
                          <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors">
                            arrow_forward
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Templates View */
              <div>
                {/* Back Button and Category Info */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setTemplates([]);
                        setSearchQuery('');
                        setSelectedStatus('all');
                      }}
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined">arrow_back</span>
                      <span>Back to Categories</span>
                    </button>
                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {templates.length} template{templates.length !== 1 ? 's' : ''} in this category
                      </p>
                    </div>
                  </div>
                </div>

                {/* Filters & Search Bar */}
                <div className="bg-white dark:bg-[#1c242e] p-4 rounded-xl border border-gray-200 dark:border-[#29303b] shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                  {/* Search Input */}
                  <div className="relative w-full md:max-w-md">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                      <span className="material-symbols-outlined text-[20px]">search</span>
                    </div>
                    <input 
                      className="block w-full h-11 pl-10 pr-4 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-primary focus:border-primary dark:bg-[#11161d] dark:border-[#29303b] dark:placeholder-gray-500 dark:text-white transition-colors" 
                      placeholder="Search templates by name..." 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {/* Status Filter */}
                  <div className="flex w-full md:w-auto gap-3 overflow-x-auto pb-1 md:pb-0">
                    <select 
                      className="h-11 pl-3 pr-8 text-sm bg-white dark:bg-[#11161d] border border-gray-300 dark:border-[#29303b] rounded-lg text-gray-700 dark:text-gray-300 focus:ring-primary focus:border-primary"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Template Grid */}
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading templates...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4 text-center">
                  <span className="material-symbols-outlined text-6xl text-red-500">error</span>
                  <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                  <button
                    onClick={fetchTemplates}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4 text-center">
                  <span className="material-symbols-outlined text-6xl text-gray-400">inbox</span>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No templates found</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {selectedStatus !== 'all' || searchQuery
                      ? 'Try adjusting your filters'
                      : `No templates in "${categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}" category yet`}
                  </p>
                  {selectedStatus === 'all' && !searchQuery && (
                    <button
                      onClick={() => navigate('/templates/new')}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Add New Template
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {templates.map((template) => {
                  const category = categories.find(cat => cat.id === template.category_id || cat.slug === template.category_slug);
                  const categoryName = template.category_name || category?.name || template.category_slug || '';
                  const categoryIcon = template.category_icon || category?.icon || 'image';
                  const categoryColor = template.category_color || category?.color || 'blue';
                  
                  return (
                    <div 
                      key={template.id}
                      className="group flex flex-col bg-white dark:bg-[#1c242e] rounded-xl border border-gray-200 dark:border-[#29303b] hover:shadow-lg hover:border-primary/50 transition-all duration-300 overflow-visible"
                    >
                      <div className="relative h-40 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {template.file_url ? (
                          <>
                            <TemplateThumbnail
                              fileUrl={getFileUrl(template.file_url)}
                              alt={template.name}
                              categoryName={categoryName}
                              categoryColor={categoryColor}
                              categoryIcon={categoryIcon}
                              getCategoryGradient={getCategoryGradient}
                            />
                            <button
                              type="button"
                              title="Preview full size"
                              aria-label={`Preview ${template.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTemplate(template);
                              }}
                              className="absolute inset-0 z-[5] flex items-end justify-start p-2 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset transition-opacity"
                            >
                              <span className="inline-flex items-center gap-1 rounded-md bg-black/60 text-white text-xs font-medium px-2 py-1 backdrop-blur-sm">
                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                                Preview
                              </span>
                            </button>
                          </>
                        ) : (
                          <div 
                            className="absolute inset-0 transition-transform duration-500 group-hover:scale-105 flex items-center justify-center" 
                            style={{
                              background: getCategoryGradient(categoryName, categoryColor)
                            }}
                          >
                            <span className="material-symbols-outlined text-white/30 text-6xl">
                              {categoryIcon}
                            </span>
                          </div>
                        )}
                        <div className="absolute top-3 right-3 z-10 pointer-events-none">
                          <span className={`px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(template.status)} border rounded-full backdrop-blur-sm bg-white/50 dark:bg-black/50`}>
                            {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 p-5 gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors min-w-0 flex-1">
                            {template.name}
                          </h3>
                          {showTemplateKebabMenu && (
                            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setOpenMenuTemplateId((prev) => (prev === template.id ? null : template.id));
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                aria-label="Template options"
                                disabled={updatingId === template.id}
                              >
                                <span className="material-symbols-outlined text-[20px]">more_vert</span>
                              </button>
                              {openMenuTemplateId === template.id && (
                                <div
                                  className="absolute right-0 bottom-full mb-1 py-1 w-48 bg-white dark:bg-[#29303b] border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-[100] min-w-[12rem]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {template.file_url && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuTemplateId(null);
                                        setPreviewTemplate(template);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                                      Preview
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(template.id, 'active')}
                                    disabled={updatingId === template.id}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-[18px] text-green-600">check_circle</span>
                                    Set Active
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(template.id, 'draft')}
                                    disabled={updatingId === template.id}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-[18px] text-amber-600">edit</span>
                                    Set to Draft
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(template.id, 'archived')}
                                    disabled={updatingId === template.id}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-[18px] text-gray-500">archive</span>
                                    Archive
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuTemplateId(null);
                                      navigate(`/templates/${template.id}/edit`);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                    Edit template
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    disabled={updatingId === template.id}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {template.description || 'No description'}
                        </p>
                        {template.file_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewTemplate(template)}
                            className="text-left text-xs font-medium text-primary hover:text-blue-400 inline-flex items-center gap-1 w-fit"
                          >
                            <span className="material-symbols-outlined text-[14px]">open_in_full</span>
                            Preview template
                          </button>
                        )}
                        <div className="mt-auto pt-3 flex flex-col gap-1.5 border-t border-gray-100 dark:border-[#29303b]">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${getCategoryBadgeClass(categoryColor)} text-xs font-medium`}>
                              <span className="material-symbols-outlined text-[14px]">{categoryIcon}</span>
                              {categoryName}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">Edited {formatTimeAgo(template.updated_at)}</span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Added by{' '}
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {template.created_by_name?.trim() || 'Unknown'}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              
                {/* New Template Placeholder Card */}
                <button 
                  onClick={() => navigate('/templates/new')}
                  className="group flex flex-col items-center justify-center bg-transparent border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl min-h-[300px] hover:border-primary hover:bg-primary/5 transition-all duration-300"
                >
                  <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-primary/20 transition-colors mb-4">
                    <span className="material-symbols-outlined text-[32px] text-gray-400 group-hover:text-primary">add</span>
                  </div>
                  <span className="font-semibold text-gray-600 dark:text-gray-300 group-hover:text-primary">Create New Template</span>
                </button>
              </div>
            )}

                {/* Pagination - Only show for templates */}
                {selectedCategory && templates.length > 0 && (
                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-[#29303b] pt-6 mt-4">
                    <div className="hidden sm:block">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Showing <span className="font-medium text-gray-900 dark:text-white">1</span> to <span className="font-medium text-gray-900 dark:text-white">{templates.length}</span> of <span className="font-medium text-gray-900 dark:text-white">{templates.length}</span> results
                      </p>
                    </div>
                    <div className="flex flex-1 justify-between sm:justify-end gap-3">
                      <button className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-[#29303b] bg-white dark:bg-[#1c242e] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 opacity-50 cursor-not-allowed">
                        Previous
                      </button>
                      <button className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-[#29303b] bg-white dark:bg-[#1c242e] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary dark:hover:text-primary transition-colors">
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {previewTemplate && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-preview-title"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-gray-600 bg-[#111418] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-700 px-4 py-3">
              <div className="min-w-0">
                <h2 id="template-preview-title" className="truncate text-lg font-semibold text-white">
                  {previewTemplate.name}
                </h2>
                <p className="mt-0.5 truncate text-xs text-gray-400">
                  {previewTemplate.file_format?.toUpperCase() || '—'} · {previewTemplate.aspect_ratio || '—'}
                  {templateIsVideo(previewTemplate) ? ' · Video' : ' · Image'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                aria-label="Close preview"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
            <div className="flex min-h-[200px] flex-1 items-center justify-center overflow-auto bg-black/50 p-4">
              {previewTemplate.file_url ? (
                templateIsVideo(previewTemplate) ? (
                  <video
                    key={previewTemplate.id}
                    src={getFileUrl(previewTemplate.file_url)}
                    controls
                    playsInline
                    className="max-h-[min(75vh,720px)] w-full max-w-full rounded-md"
                  />
                ) : (
                  <img
                    src={getFileUrl(previewTemplate.file_url)}
                    alt={previewTemplate.name}
                    className="max-h-[min(75vh,720px)] w-full max-w-full object-contain rounded-md"
                  />
                )
              ) : (
                <p className="text-gray-400 text-sm">No file attached to this template.</p>
              )}
            </div>
            {previewTemplate.description ? (
              <div className="border-t border-gray-700 px-4 py-3 text-sm text-gray-300">
                {previewTemplate.description}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateLibrary;

