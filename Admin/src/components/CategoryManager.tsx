import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
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

const CategoryManager: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'category',
    color: 'blue',
    is_active: true,
    sort_order: 0,
  });

  const colorOptions = [
    { value: 'blue', label: 'Blue' },
    { value: 'purple', label: 'Purple' },
    { value: 'pink', label: 'Pink' },
    { value: 'green', label: 'Green' },
    { value: 'red', label: 'Red' },
    { value: 'orange', label: 'Orange' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'gray', label: 'Gray' },
  ];

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await api.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      } else {
        // Fallback to mock data if API not ready
        setCategories([
          { id: '1', name: 'Email', slug: 'email', description: 'Email templates', icon: 'mail', color: 'blue', is_active: true, sort_order: 1 },
          { id: '2', name: 'PDF', slug: 'pdf', description: 'PDF documents', icon: 'description', color: 'purple', is_active: true, sort_order: 2 },
          { id: '3', name: 'UI', slug: 'ui', description: 'UI templates', icon: 'web', color: 'pink', is_active: true, sort_order: 3 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to mock data on error
      setCategories([
        { id: '1', name: 'Email', slug: 'email', description: 'Email templates', icon: 'mail', color: 'blue', is_active: true, sort_order: 1 },
        { id: '2', name: 'PDF', slug: 'pdf', description: 'PDF documents', icon: 'description', color: 'purple', is_active: true, sort_order: 2 },
        { id: '3', name: 'UI', slug: 'ui', description: 'UI templates', icon: 'web', color: 'pink', is_active: true, sort_order: 3 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, formData);
      } else {
        await api.createCategory(formData);
      }
      
      setShowAddModal(false);
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        icon: 'category',
        color: 'blue',
        is_active: true,
        sort_order: 0,
      });
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      const message = error instanceof Error ? error.message : 'Failed to save category. Please try again.';
      alert(message);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || 'category',
      color: category.color,
      is_active: category.is_active,
      sort_order: category.sort_order,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }
    try {
      await api.deleteCategory(id);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. Please try again.');
    }
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
      gray: 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400',
    };
    return classes[color as keyof typeof classes] || classes.blue;
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

      {/* Main Content */}
      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
        <header className="flex items-center justify-between shrink-0 h-16 px-6 md:px-10 bg-white dark:bg-[#111418] border-b border-gray-200 dark:border-[#29303b] z-20">
          <button 
            className="md:hidden p-2 text-gray-600 dark:text-gray-300"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
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
                style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDmcR-aOkyfl3VSc1N2AiLe1MQj5MbXlAfUzEjSN3JNGCC6icO7VZHNqMJJByJ_LyRpEJ1Unui7jNicoxH1PbE97BW4WyrL2t3lb-uPCDBnyYTXpK21wIth1lrs8zUh4Jdc8Un5zKJzx2FbWKwHVwza7Lye54fqvckgE5GKWc1xHY7BbPyuAAvYEYuqkh10Aji-wsXVZogzETTT7OK3oTB1rW6zrGVQxSlYpnTU-3g6OQJsVl-0yoL9lZDferszahF53l1_xjQNF0I")'}}
              ></div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6 md:p-10">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#9fa6ad]">
              <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <Link to="/templates" className="hover:text-primary transition-colors">Template Library</Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-gray-900 dark:text-white font-medium">Categories</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Manage Categories</h2>
                <p className="text-gray-500 dark:text-[#9fa6ad]">Add, edit, and organize template categories.</p>
              </div>
              <button 
                onClick={() => {
                  setEditingCategory(null);
                  setFormData({
                    name: '',
                    slug: '',
                    description: '',
                    icon: 'category',
                    color: 'blue',
                    is_active: true,
                    sort_order: categories.length + 1,
                  });
                  setShowAddModal(true);
                }}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>Add New Category</span>
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Loading categories...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div 
                    key={category.id}
                    className="bg-white dark:bg-[#1c242e] rounded-xl border border-gray-200 dark:border-[#29303b] p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getCategoryBadgeClass(category.color)}`}>
                          <span className="material-symbols-outlined text-[24px]">{category.icon || 'category'}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">{category.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{category.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{category.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#29303b]">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${getCategoryBadgeClass(category.color)} text-xs font-medium`}>
                        <span className="material-symbols-outlined text-[14px]">{category.icon || 'category'}</span>
                        {category.name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${category.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add/Edit Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1c242e] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-[#29303b] flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCategory(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full rounded-lg border-gray-300 bg-white dark:bg-[#11161d] dark:border-[#29303b] text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary text-sm p-2.5"
                    placeholder="e.g. Video Templates"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 bg-white dark:bg-[#11161d] dark:border-[#29303b] text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary text-sm p-2.5"
                    placeholder="e.g. video-templates"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 bg-white dark:bg-[#11161d] dark:border-[#29303b] text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary text-sm p-2.5"
                  rows={3}
                  placeholder="Brief description of this category..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 bg-white dark:bg-[#11161d] dark:border-[#29303b] text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary text-sm p-2.5"
                    placeholder="Material icon name (e.g. mail, description)"
                  />
                  <p className="text-xs text-gray-500">Material Symbols icon name</p>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 bg-white dark:bg-[#11161d] dark:border-[#29303b] text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary text-sm p-2.5"
                  >
                    {colorOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary rounded"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-lg border-gray-300 bg-white dark:bg-[#11161d] dark:border-[#29303b] text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary text-sm p-2.5"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#29303b]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCategory(null);
                  }}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-md shadow-blue-500/20 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  <span>{editingCategory ? 'Update Category' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;

