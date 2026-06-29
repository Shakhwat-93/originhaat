'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  FileText, Edit3, Plus, Trash2, Save, X, Globe, Eye,
  RefreshCw, CheckCircle, AlertCircle
} from 'lucide-react';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '@/lib/alerts';

interface DynamicPage {
  slug: string;
  title: string;
  title_bn: string | null;
  content: string;
  content_bn: string | null;
  updated_at: string;
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<DynamicPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<DynamicPage | null>(null);

  // Form states for creating / editing pages
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [content, setContent] = useState('');
  const [contentBn, setContentBn] = useState('');
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('oh_pages')
      .select('*')
      .order('slug', { ascending: true });

    if (data) setPages(data);
    setLoading(false);
  };

  const handleEditClick = (page: DynamicPage) => {
    setEditingPage(page);
    setSlug(page.slug);
    setTitle(page.title);
    setTitleBn(page.title_bn || '');
    setContent(page.content);
    setContentBn(page.content_bn || '');
    setIsNew(false);
  };

  const handleAddNewClick = () => {
    setEditingPage({
      slug: '',
      title: '',
      title_bn: '',
      content: '',
      content_bn: '',
      updated_at: new Date().toISOString()
    });
    setSlug('');
    setTitle('');
    setTitleBn('');
    setContent('');
    setContentBn('');
    setIsNew(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim() || !title.trim() || !content.trim()) {
      showErrorAlert('Missing Info', 'Please fill in slug, title, and content.');
      return;
    }

    const payload = {
      slug: slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
      title,
      title_bn: titleBn || null,
      content,
      content_bn: contentBn || null,
      updated_at: new Date().toISOString()
    };

    let error;
    if (isNew) {
      const { error: insertErr } = await supabase
        .from('oh_pages')
        .insert(payload);
      error = insertErr;
    } else {
      const { error: updateErr } = await supabase
        .from('oh_pages')
        .update(payload)
        .eq('slug', slug);
      error = updateErr;
    }

    if (error) {
      showErrorAlert('Error Saving', error.message);
    } else {
      showSuccessAlert('Success', 'Page contents updated successfully.');
      setEditingPage(null);
      fetchPages();
    }
  };

  const handleDelete = async (slugToDelete: string) => {
    const confirm = await showConfirmAlert(
      'Delete Page?', 
      'This will permanently delete this dynamic page from the system.', 
      'Delete'
    );
    if (!confirm.isConfirmed) return;

    const { error } = await supabase
      .from('oh_pages')
      .delete()
      .eq('slug', slugToDelete);

    if (error) {
      showErrorAlert('Error Deleting', error.message);
    } else {
      showSuccessAlert('Deleted', 'Page was deleted successfully.');
      fetchPages();
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-base font-black text-gray-900 leading-tight">Dynamic Pages Manager</h1>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Manage customer-service and policy page contents</p>
        </div>
        <button
          onClick={handleAddNewClick}
          className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
        >
          <Plus size={14} />
          <span>Add New Page</span>
        </button>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-3 border-[#ff6b35] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-400 mt-2 font-semibold">Loading pages...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Pages Table/List */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-gray-800">Dynamic Pages</h3>
            <div className="space-y-3">
              {pages.map((p) => (
                <div 
                  key={p.slug}
                  className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex justify-between items-start gap-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#ff6b35] font-black text-xs bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md">
                        /{p.slug}
                      </span>
                      <span className="text-gray-800 font-bold text-xs">{p.title}</span>
                    </div>
                    {p.title_bn && (
                      <p className="text-[10px] text-gray-400 font-semibold">Bangla Title: {p.title_bn}</p>
                    )}
                    <p className="text-gray-500 text-xs line-clamp-2 pt-1.5">{p.content_bn || p.content}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={`/pages/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer"
                      title="View Page"
                    >
                      <Eye size={14} />
                    </a>
                    <button
                      onClick={() => handleEditClick(p)}
                      className="p-2 hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-[#ff6b35] rounded-lg transition-colors cursor-pointer"
                      title="Edit Contents"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.slug)}
                      className="p-2 hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Delete Page"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {pages.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-xs">No dynamic pages found. Create one!</div>
              )}
            </div>
          </div>

          {/* RIGHT: Editor Panel */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-gray-800">
                {editingPage ? (isNew ? 'New Page Editor' : 'Page Editor') : 'Select Page to Edit'}
              </h3>
              {editingPage && (
                <button 
                  onClick={() => setEditingPage(null)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {editingPage ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Page Slug / Path *</label>
                  <input
                    type="text"
                    required
                    disabled={!isNew}
                    value={slug}
                    onChange={(e) => setSlug(e.currentTarget.value)}
                    placeholder="e.g. return-policy"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#ff6b35] disabled:bg-gray-50 text-gray-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">English Title *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.currentTarget.value)}
                      placeholder="e.g. Return Policy"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#ff6b35] text-gray-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Bangla Title</label>
                    <input
                      type="text"
                      value={titleBn}
                      onChange={(e) => setTitleBn(e.currentTarget.value)}
                      placeholder="যেমন: রিটার্ন পলিসি"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#ff6b35] text-gray-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">English Content *</label>
                  <textarea
                    required
                    value={content}
                    onChange={(e) => setContent(e.currentTarget.value)}
                    placeholder="Write the English contents of the page..."
                    className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-[#ff6b35] h-32 text-gray-800 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Bangla Content</label>
                  <textarea
                    value={contentBn}
                    onChange={(e) => setContentBn(e.currentTarget.value)}
                    placeholder="বাংলা কনটেন্ট এখানে লিখুন..."
                    className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-[#ff6b35] h-32 text-gray-800 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-2.8 bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-[.98]"
                >
                  <Save size={14} />
                  <span>Save Page Contents</span>
                </button>
              </form>
            ) : (
              <div className="text-center py-16 text-gray-400 text-xs">
                Select a page from the left or click "Add New Page" to edit.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
