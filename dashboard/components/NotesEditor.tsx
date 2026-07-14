'use client';

import { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Highlight } from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';

const IconBold = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/></svg>;
const IconItalic = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 4h-9M14 20H5M15 4L9 20"/></svg>;
const IconBulletList = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
const IconOrderedList = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6h11M10 12h11M10 18h11M4 6h1v4m-1 0h3M4 16h2v4M4 20h3"/></svg>;
const IconHighlight = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b border-b-divider bg-surface-header sticky top-0 z-10 flex-wrap">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-accent text-white' : 'text-t-muted hover:text-t-primary hover:bg-surface-card'}`}
        title="Bold"
      >
        <IconBold />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-accent text-white' : 'text-t-muted hover:text-t-primary hover:bg-surface-card'}`}
        title="Italic"
      >
        <IconItalic />
      </button>
      <div className="w-px h-4 bg-b-divider mx-1.5" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-accent text-white' : 'text-t-muted hover:text-t-primary hover:bg-surface-card'}`}
        title="Bullet List"
      >
        <IconBulletList />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-accent text-white' : 'text-t-muted hover:text-t-primary hover:bg-surface-card'}`}
        title="Numbered List"
      >
        <IconOrderedList />
      </button>
      <div className="w-px h-4 bg-b-divider mx-1.5" />
      <button
        onClick={() => editor.chain().focus().toggleHighlight({ color: '#ffcc00' }).run()}
        className={`p-1.5 rounded transition-colors ${editor.isActive('highlight') ? 'bg-amber-400 text-black' : 'text-t-muted hover:text-t-primary hover:bg-surface-card'}`}
        title="Highlight Background"
      >
        <IconHighlight />
      </button>
      
      <div className="flex items-center gap-1 ml-1 pl-1 border-l border-b-divider">
        <span className="text-[10px] font-bold text-t-ghost uppercase tracking-widest px-1">Color:</span>
        <input
          type="color"
          onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()}
          value={editor.getAttributes('textStyle').color || '#eeeeee'}
          className="w-5 h-5 cursor-pointer bg-transparent rounded overflow-hidden"
          title="Text Color"
        />
      </div>
    </div>
  )
}

type Variant = 'compact' | 'expanded';

interface NotesEditorProps {
  leadId: number;
  initialNotes: string | null;
  initialFollowUp?: Date | string | null;
  onSave?: (newNotes: string, nextFollowUp: string | null) => void;
  variant?: Variant;
}

function toDateInputValue(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function NotesEditor({ leadId, initialNotes, initialFollowUp, onSave, variant = 'compact' }: NotesEditorProps) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [followUp, setFollowUp] = useState<string>(toDateInputValue(initialFollowUp));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFollowUp(toDateInputValue(initialFollowUp));
  }, [initialFollowUp]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
    ],
    content: initialNotes || '',
    editorProps: {
      attributes: {
        class: 'p-6 bg-surface-input text-base text-t-primary font-medium resize-none outline-none min-h-[250px] sm:min-h-[350px] [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_h6]:text-[10px] [&_h6]:font-bold [&_h6]:text-t-muted [&_h6]:uppercase [&_h6]:tracking-[0.2em] [&_h6]:text-left [&_h6]:mt-6 [&_h6]:mb-2 focus:ring-inset focus:ring-1 focus:ring-accent/20 transition-shadow',
      },
    },
    immediatelyRender: false,
  });

  // Sync state if initialNotes prop changes from parent
  useEffect(() => {
    if (editor && initialNotes !== null && initialNotes !== undefined) {
      if (editor.getHTML() !== initialNotes) {
         editor.commands.setContent(initialNotes);
      }
    }
  }, [initialNotes, editor]);

  // Handle click outside to close (without saving)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking color picker or popups
      if ((e.target as Element)?.closest('input[type="color"]')) return;
      if ((e.target as Element)?.closest('.tiptap')) return;
      
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (open) {
          // Instead of auto-saving, we just lose focus or cancel. 
          // If they want to save, there's a explicit save button! 
          setOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, editor, initialNotes]);

  // Auto focus when opened
  useEffect(() => {
    if (open && editor) {
      setTimeout(() => {
        editor.commands.focus('end');
      }, 50);
    }
  }, [open, editor]);

  const handleSave = async () => {
    if (!editor) return;

    let currentHTML = editor.getHTML();
    const initialFollowUpStr = toDateInputValue(initialFollowUp);
    const followUpChanged = followUp !== initialFollowUpStr;
    const notesChanged = currentHTML !== (initialNotes || '');

    // No changes at all
    if (!notesChanged && !followUpChanged) {
      setOpen(false);
      return;
    }

    setSaving(true);

    let finalHTML = currentHTML;
    if (notesChanged) {
      const timestampStr = new Date().toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const timestampHTML = `<h6><span style="color: #FD551D">——</span> MODIFIED ${timestampStr}</h6><p></p>`;
      finalHTML = currentHTML + timestampHTML;
      editor.commands.setContent(finalHTML);
    }

    // Follow-up: send ISO at local noon so timezone shifts can't bump the date
    const nextFollowUpISO = followUp
      ? new Date(`${followUp}T12:00:00`).toISOString()
      : null;

    const payload: Record<string, unknown> = {};
    if (notesChanged) payload.notes = finalHTML;
    if (followUpChanged) payload.nextFollowUp = nextFollowUpISO;
    // Ensure rot timer resets even if only the follow-up changed
    if (!notesChanged) payload.resetContactedAt = true;

    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSaved(true);
      if (onSave) onSave(finalHTML, nextFollowUpISO);
      setTimeout(() => setSaved(false), 2000);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const hasNotes = initialNotes && initialNotes.trim().length > 0 && initialNotes !== '<p></p>';

  // For the compact visual preview without HTML tags:
  const getPreviewText = () => {
    if (!initialNotes) return '';
    // Strip HTML to show text preview, keep styling brutalist
    const div = document.createElement('div');
    div.innerHTML = initialNotes;
    return div.textContent || div.innerText || '';
  };

  return (
    <div className={`relative ${variant === 'expanded' ? 'w-full' : 'w-[250px] inline-block max-w-full'}`} ref={ref}>
      
      {/* Trigger Area */}
      <button
        onClick={() => setOpen(!open)}
        className={`group w-full text-left transition-all ${
          variant === 'expanded' 
            ? 'p-4 bg-surface-page rounded-lg border border-b-default hover:border-accent hover:shadow-md'
            : 'p-1.5 -ml-1.5 rounded-md hover:bg-surface-page border border-transparent hover:border-b-muted relative'
        }`}
      >
        {hasNotes ? (
           <div className={variant === 'expanded' ? 'min-h-[120px]' : ''}>
             <p className={`text-t-secondary whitespace-pre-wrap ${
               variant === 'expanded' 
                 ? 'text-sm font-medium' 
                 : 'line-clamp-2 text-xs italic opacity-85 border-l-2 border-accent pl-2 py-0.5'
             }`}>
               {getPreviewText()}
             </p>
           </div>
        ) : variant === 'expanded' ? (
           <div className="flex flex-col items-center justify-center py-10 text-t-ghost group-hover:text-accent transition-colors min-h-[120px] rounded-lg bg-surface-badge/30 group-hover:bg-surface-badge/60">
             <svg className="w-6 h-6 mb-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
             <span className="text-xs font-black uppercase tracking-widest leading-none">Add Follow-Up Note</span>
             <span className="text-[10px] font-semibold opacity-60 mt-2 block">Click to open scratchpad</span>
           </div>
        ) : (
           <span className="text-[10px] sm:text-xs font-bold text-t-ghost uppercase tracking-widest px-2 py-0.5 bg-surface-badge rounded border border-dashed border-b-muted group-hover:border-accent group-hover:text-accent transition-colors flex items-center justify-center gap-1.5">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
             Add Follow-Up Note
           </span>
        )}
      </button>

      {/* Full-Screen / Centered Editor Modal with Tiptap */}
      {open && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-6">
          {/* Blur Backdrop */}
          <div
            className="absolute inset-0 bg-surface-header/80 backdrop-blur-md transition-opacity"
            onClick={() => {
              if (editor) editor.commands.setContent(initialNotes || '');
              setFollowUp(toDateInputValue(initialFollowUp));
              setOpen(false);
            }}
          />
          
          {/* Modal Content */}
          <div className="relative z-10 bg-surface-card rounded-2xl shadow-2xl border border-accent/30 overflow-hidden animate-in fade-in zoom-in-95 duration-200 w-full max-w-2xl flex flex-col font-mono ring-4 ring-black/40 text-left">
            <div className="px-5 py-4 bg-surface-header border-b border-b-divider flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                 <span className="text-xs sm:text-sm font-black text-t-primary uppercase tracking-widest text-shadow-sm">Follow-Up Scratchpad</span>
              </div>
            </div>
            
            <MenuBar editor={editor} />
            
            <div className="overflow-y-auto max-h-[60vh] bg-surface-input">
              <EditorContent editor={editor} />
            </div>

            <div className="px-5 py-3 border-t border-b-divider flex flex-wrap items-center justify-between gap-3 bg-surface-header">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-t-muted uppercase tracking-widest">
                  <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Next Follow-Up
                </label>
                <input
                  type="date"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  min={toDateInputValue(new Date())}
                  className="bg-surface-input border border-b-muted text-t-primary text-[11px] font-bold rounded px-2 py-1.5 focus:border-accent focus:ring-1 focus:ring-accent outline-none uppercase tracking-wider"
                />
                {followUp && (
                  <button
                    type="button"
                    onClick={() => setFollowUp('')}
                    className="text-[10px] font-bold text-t-ghost hover:text-accent uppercase tracking-widest"
                    title="Clear follow-up date"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => {
                    if (editor) editor.commands.setContent(initialNotes || '');
                    setFollowUp(toDateInputValue(initialFollowUp));
                    setOpen(false);
                  }}
                  className="px-3 py-2 text-[10px] font-bold text-t-muted hover:text-accent uppercase tracking-widest transition-colors rounded-lg hover:bg-surface-card"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-accent text-white hover:bg-accent-hover text-[11px] font-bold rounded uppercase tracking-widest shadow-lg shadow-accent/20 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  )}
                  {saving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
