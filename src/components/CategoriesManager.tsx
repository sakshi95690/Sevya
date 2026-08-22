import React, { useState } from 'react';
import { SevaCategory, User } from '../types';
import { Database, Plus, Edit2, Trash2, Check, X, Tag } from 'lucide-react';
import { api } from '../services/api';

interface CategoriesManagerProps {
  categories: SevaCategory[];
  currentUser: User;
  onRefresh?: () => void;
}

export const CategoriesManager: React.FC<CategoriesManagerProps> = ({
  categories,
  currentUser,
  onRefresh,
}) => {
  const [catList, setCatList] = useState<SevaCategory[]>(categories);
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<SevaCategory | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#f59e0b');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'temple_admin';

  const handleOpenAdd = () => {
    setEditingCat(null);
    setName('');
    setDescription('');
    setColor('#f59e0b');
    setError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (cat: SevaCategory) => {
    setEditingCat(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setColor(cat.color || '#f59e0b');
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (editingCat) {
        const updated = await api.updateCategory(editingCat.id, {
          name: name.trim(),
          description: description.trim(),
          color,
        });
        setCatList((prev) => prev.map((c) => (c.id === editingCat.id ? updated : c)));
      } else {
        const created = await api.createCategory({
          name: name.trim(),
          description: description.trim(),
          color,
        });
        setCatList((prev) => [...prev, created]);
      }
      setShowModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save Seva category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cat: SevaCategory) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      setLoading(true);
      await api.deleteCategory(cat.id);
      setCatList((prev) => prev.filter((c) => c.id !== cat.id));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Error deleting category: ${err.message || 'Failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const displayList = catList.length > 0 ? catList : categories;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-600" />
            Seva Categories Master ({displayList.length})
          </h3>
          <p className="text-xs text-slate-500">Categorize tasks, sevas, and projects across temple operations</p>
        </div>

        {isAuthorized && (
          <button
            onClick={handleOpenAdd}
            className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayList.map((cat) => (
          <div key={cat.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="space-y-1 pr-2 min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#f59e0b' }} />
                <span className="font-bold text-slate-900 truncate">{cat.name}</span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2">{cat.description || 'No description provided'}</p>
            </div>

            {isAuthorized && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit Category"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete Category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editingCat ? 'Edit Seva Category' : 'Create New Seva Category'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 shrink-0 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">{error}</div>}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Festival Seva"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of duties under this category"
                  rows={2}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Badge Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-1"
                  />
                  <span className="font-mono text-slate-600 uppercase text-xs">{color}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-2 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-4 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> {editingCat ? 'Update' : 'Create'} Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
