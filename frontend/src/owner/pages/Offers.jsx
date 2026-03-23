import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, DatePicker } from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../components/ui/Button.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import FormInput, { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import SearchField from "../../components/ui/SearchField.jsx";
import {
  fetchOwnerOffers,
  createOwnerOffer,
  updateOwnerOffer,
  deleteOwnerOffer,
} from "../../redux/slices/offerSlice.js";
import { fetchOwnerRooms } from "../../redux/slices/ownerSlice.js";

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed Amount ($)" },
];

const OfferFormModal = React.memo(({ open, offer, onClose, onSave, isNew, rooms }) => {
  const dispatch = useDispatch();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagLabel, setTagLabel] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState(10);
  const [roomId, setRoomId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (offer && !isNew) {
        setTitle(offer.title || "");
        setDescription(offer.description || "");
        setTagLabel(offer.tag_label || "");
        setDiscountType(offer.discount_type || "percentage");
        setDiscountValue(offer.discount_value ?? 10);
        setRoomId(offer.room_id || "");
        setStartDate(offer.start_date || "");
        setEndDate(offer.end_date || "");
      } else {
        setTitle(""); setDescription(""); setTagLabel(""); setDiscountType("percentage");
        setDiscountValue(10); setRoomId(""); setStartDate(""); setEndDate("");
      }
      setError("");
    }
  }, [offer, open, isNew]);

  const handleSave = useCallback(async () => {
    setError("");
    if (!title.trim()) { setError("Title is required."); return; }
    if (!endDate) { setError("End date is required."); return; }
    setSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      tag_label: tagLabel.trim() || null,
      discount_type: discountType,
      discount_value: Number(discountValue) || 0,
      room_id: roomId || null,
      start_date: startDate || undefined,
      end_date: endDate,
    };

    try {
      if (isNew) {
        await dispatch(createOwnerOffer(payload)).unwrap();
      } else {
        await dispatch(updateOwnerOffer({ id: offer.id, ...payload })).unwrap();
      }
      onSave();
    } catch (err) {
      setError(err || `Failed to ${isNew ? "create" : "update"} offer.`);
    } finally {
      setSaving(false);
    }
  }, [dispatch, title, description, tagLabel, discountType, discountValue, roomId, startDate, endDate, isNew, offer?.id, onSave]);

  return (
    <Modal title={isNew ? "Create Offer" : "Edit Offer"} open={open} onCancel={onClose} footer={null} destroyOnClose width={600}>
      <div className="space-y-4 pt-4">
        <FormInput label="Offer Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Weekend Special 15% Off" />
        <FormInput label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
        <FormInput label="Tag / Badge Label (optional)" value={tagLabel} onChange={(e) => setTagLabel(e.target.value)} placeholder="e.g., Festival Deal, Summer Sale" />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Discount Type</span>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className={INPUT_STYLES}>
              {DISCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <FormInput label={discountType === "percentage" ? "Discount (%)" : "Discount ($)"} type="number" min={0} step={discountType === "percentage" ? 1 : 0.01} max={discountType === "percentage" ? 100 : undefined} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Start Date</span>
            <DatePicker className={INPUT_STYLES} value={startDate ? dayjs(startDate) : null} onChange={(_, ds) => setStartDate(ds || "")} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">End Date</span>
            <DatePicker className={INPUT_STYLES} value={endDate ? dayjs(endDate) : null} onChange={(_, ds) => setEndDate(ds || "")} disabledDate={(c) => startDate && c && c < dayjs(startDate)} />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted">Apply to Room</span>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={INPUT_STYLES}>
            <option value="">All My Rooms</option>
            {(rooms || []).map((r) => <option key={r.id} value={r.id}>{r.title} — {r.location}</option>)}
          </select>
          <p className="text-xs text-muted">Leave as "All My Rooms" to apply this offer across all your properties.</p>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : isNew ? "Create Offer" : "Save Changes"}</Button>
        </div>
      </div>
    </Modal>
  );
});

function statusLabel(offer) {
  const today = dayjs().format("YYYY-MM-DD");
  if (!offer.is_active) return { text: "Inactive", color: "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400" };
  if (offer.end_date < today) return { text: "Expired", color: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400" };
  if (offer.start_date > today) return { text: "Scheduled", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400" };
  return { text: "Active", color: "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400" };
}

export default function OwnerOffers() {
  const dispatch = useDispatch();
  const { offers, loading } = useSelector((state) => state.offers);
  const { rooms } = useSelector((state) => state.owner);
  const [editingOffer, setEditingOffer] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(fetchOwnerOffers());
    dispatch(fetchOwnerRooms());
  }, [dispatch]);

  const filteredOffers = useMemo(() => {
    if (!searchTerm) return offers || [];
    const s = searchTerm.toLowerCase();
    return (offers || []).filter((o) =>
      o.title?.toLowerCase().includes(s) ||
      o.tag_label?.toLowerCase().includes(s)
    );
  }, [offers, searchTerm]);

  const handleSave = useCallback(() => {
    setEditingOffer(null);
    setIsCreating(false);
    dispatch(fetchOwnerOffers());
  }, [dispatch]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Delete this offer?")) return;
    await dispatch(deleteOwnerOffer(id));
  }, [dispatch]);

  const handleToggleActive = useCallback(async (offer) => {
    await dispatch(updateOwnerOffer({ id: offer.id, is_active: !offer.is_active }));
    dispatch(fetchOwnerOffers());
  }, [dispatch]);

  if (loading && (!offers || offers.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm text-muted">Loading offers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Offers"
        subtitle={`Create discount offers for your rooms (${filteredOffers.length} total)`}
        actions={
          <Button onClick={() => setIsCreating(true)}>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Create Offer
          </Button>
        }
      />

      <SearchField value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search offers..." className="max-w-md" />

      {filteredOffers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel py-12 text-center shadow-sm">
          <svg className="mx-auto h-12 w-12 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          <p className="mt-4 text-sm font-medium text-ink">No offers yet</p>
          <p className="mt-1 text-sm text-muted">Create a discount offer to attract more guests to your rooms.</p>
          <div className="mt-4"><Button onClick={() => setIsCreating(true)}>Create Offer</Button></div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOffers.map((offer) => {
            const status = statusLabel(offer);
            const appliedRoom = offer.room_id ? (rooms || []).find((r) => r.id === offer.room_id) : null;
            return (
              <div key={offer.id} className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm transition-shadow hover:shadow-md">
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink truncate">{offer.title}</h3>
                      {offer.description && <p className="mt-0.5 text-xs text-muted line-clamp-2">{offer.description}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.text}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {offer.discount_type === "percentage" ? `${offer.discount_value}%` : `$${offer.discount_value}`} OFF
                    </span>
                    {offer.tag_label && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {offer.tag_label}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted space-y-1">
                    <p>{dayjs(offer.start_date).format("MMM D, YYYY")} — {dayjs(offer.end_date).format("MMM D, YYYY")}</p>
                    <p>{appliedRoom ? `Room: ${appliedRoom.title}` : "All my rooms"}</p>
                  </div>

                  <div className="flex gap-2 border-t border-border pt-3">
                    <button onClick={() => setEditingOffer(offer)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">Edit</button>
                    <button onClick={() => handleToggleActive(offer)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600">
                      {offer.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => handleDelete(offer.id)} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <OfferFormModal
        open={!!editingOffer || isCreating}
        offer={editingOffer}
        isNew={isCreating}
        onClose={() => { setEditingOffer(null); setIsCreating(false); }}
        onSave={handleSave}
        rooms={rooms}
      />
    </div>
  );
}
