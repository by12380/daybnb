import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PageHeader from "../../components/ui/PageHeader.jsx";
import SearchField from "../../components/ui/SearchField.jsx";
import Button from "../../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import {
  createAdminAiFaq,
  deleteAdminAiFaq,
  fetchAdminAiFaqs,
  updateAdminAiFaq,
} from "../../redux/slices/aiFaqSlice.js";

const EMPTY_FORM = {
  question: "",
  answer: "",
  sort_order: 0,
  is_active: true,
};

function sortFaqs(items) {
  return [...(items || [])].sort((a, b) => {
    if ((a.sort_order || 0) !== (b.sort_order || 0)) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    }
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });
}

function statusBadge(isActive) {
  return isActive
    ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

function FormCard({ title, description, children }) {
  return (
    <div className="rounded-3xl border border-border bg-panel p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export default function AdminAiFaqs() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.aiFaqs);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    dispatch(fetchAdminAiFaqs());
  }, [dispatch]);

  const sortedFaqs = useMemo(() => sortFaqs(items), [items]);

  const filteredFaqs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return sortedFaqs;

    return sortedFaqs.filter((faq) =>
      faq.question?.toLowerCase().includes(query) ||
      faq.answer?.toLowerCase().includes(query)
    );
  }, [searchTerm, sortedFaqs]);

  const updateField = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSubmitError("");
  }, []);

  const handleEdit = useCallback((faq) => {
    setEditingId(faq.id);
    setSubmitError("");
    setForm({
      question: faq.question || "",
      answer: faq.answer || "",
      sort_order: faq.sort_order || 0,
      is_active: !!faq.is_active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setSubmitError("");

      const payload = {
        question: String(form.question || "").trim(),
        answer: String(form.answer || "").trim(),
        sort_order: Number(form.sort_order || 0),
        is_active: !!form.is_active,
      };

      if (!payload.question) {
        setSubmitError("Question is required.");
        return;
      }

      if (!payload.answer) {
        setSubmitError("Answer is required.");
        return;
      }

      try {
        if (editingId) {
          await dispatch(updateAdminAiFaq({ id: editingId, ...payload })).unwrap();
        } else {
          await dispatch(createAdminAiFaq(payload)).unwrap();
        }
        resetForm();
      } catch (err) {
        setSubmitError(err || `Failed to ${editingId ? "update" : "create"} FAQ.`);
      }
    },
    [dispatch, editingId, form, resetForm]
  );

  const handleDelete = useCallback(
    async (faq) => {
      if (!window.confirm(`Delete this FAQ?\n\n${faq.question}`)) return;
      await dispatch(deleteAdminAiFaq(faq.id));
      if (editingId === faq.id) {
        resetForm();
      }
    },
    [dispatch, editingId, resetForm]
  );

  const handleToggleActive = useCallback(
    async (faq) => {
      await dispatch(
        updateAdminAiFaq({
          id: faq.id,
          is_active: !faq.is_active,
        })
      );
    },
    [dispatch]
  );

  if (loading && items.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading FAQs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI FAQs"
        subtitle="Add the common questions your users ask so the AI assistant can suggest and answer them consistently."
        actions={editingId ? <Button variant="outline" onClick={resetForm}>New FAQ</Button> : null}
      />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <FormCard
          title={editingId ? "Edit FAQ" : "Add FAQ"}
          description="Use short, natural questions and clear answers. Active FAQs also appear as AI quick prompts."
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted">Question</span>
              <textarea
                rows={3}
                value={form.question}
                onChange={(event) => updateField("question", event.target.value)}
                placeholder="How do I book a room on Daybnb?"
                className={`${INPUT_STYLES} min-h-[88px] resize-y`}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted">Answer</span>
              <textarea
                rows={7}
                value={form.answer}
                onChange={(event) => updateField("answer", event.target.value)}
                placeholder="Choose a room, select your date, submit the booking, and wait for approval if instant booking is not enabled."
                className={`${INPUT_STYLES} min-h-[180px] resize-y`}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Sort Order"
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(event) => updateField("sort_order", event.target.value)}
              />

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted">Visibility</span>
                <div className="flex h-[42px] items-center gap-2 rounded-xl border border-border bg-panel px-3">
                  <input
                    type="checkbox"
                    checked={!!form.is_active}
                    onChange={(event) => updateField("is_active", event.target.checked)}
                    className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-ink">Active for AI</span>
                </div>
              </div>
            </div>

            {(submitError || error) ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {submitError || error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingId ? "Save Changes" : "Add FAQ"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Clear
              </Button>
            </div>
          </form>
        </FormCard>

        <div className="space-y-4">
          <SearchField
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onClear={() => setSearchTerm("")}
            placeholder="Search questions or answers..."
            inputClassName="max-w-lg"
          />

          {filteredFaqs.length === 0 ? (
            <div className="rounded-3xl border border-border bg-panel py-12 text-center shadow-sm">
              <svg
                className="mx-auto h-12 w-12 text-muted/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-3 3-3-3z"
                />
              </svg>
              <p className="mt-4 text-sm font-medium text-ink">
                {searchTerm ? "No FAQs match your search" : "No FAQs yet"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {searchTerm
                  ? "Try a different keyword."
                  : "Create your first FAQ to guide users with consistent AI answers."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFaqs.map((faq) => (
                <div
                  key={faq.id}
                  className={`rounded-3xl border bg-panel p-5 shadow-sm transition-shadow hover:shadow-md ${
                    editingId === faq.id ? "border-brand-300 ring-2 ring-brand-100" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(
                            faq.is_active
                          )}`}
                        >
                          {faq.is_active ? "Active" : "Inactive"}
                        </span>
                        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                          Order {faq.sort_order || 0}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-ink">{faq.question}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                        {faq.answer}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(faq)}
                        disabled={loading}
                        className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(faq)}
                        disabled={loading}
                        className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
                      >
                        {faq.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(faq)}
                        disabled={loading}
                        className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
