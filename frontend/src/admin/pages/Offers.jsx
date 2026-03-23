import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Button from "../../components/ui/Button.jsx";
import { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import SearchField from "../../components/ui/SearchField.jsx";
import OfferBannerCanvas from "../../components/OfferBannerCanvas.jsx";
import {
  fetchAdminOffers,
  updateAdminOffer,
  deleteAdminOffer,
} from "../../redux/slices/offerSlice.js";

function statusLabel(offer) {
  const today = dayjs().format("YYYY-MM-DD");
  if (!offer.is_active) return { text: "Inactive", color: "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400" };
  if (offer.end_date < today) return { text: "Expired", color: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400" };
  if (offer.start_date > today) return { text: "Scheduled", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400" };
  return { text: "Active", color: "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400" };
}

export default function AdminOffers() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { offers, loading } = useSelector((state) => state.offers);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(fetchAdminOffers());
  }, [dispatch]);

  const filteredOffers = useMemo(() => {
    if (!searchTerm) return offers || [];
    const s = searchTerm.toLowerCase();
    return (offers || []).filter((o) =>
      o.title?.toLowerCase().includes(s) ||
      o.tag_label?.toLowerCase().includes(s) ||
      o.description?.toLowerCase().includes(s)
    );
  }, [offers, searchTerm]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Delete this offer?")) return;
    await dispatch(deleteAdminOffer(id));
  }, [dispatch]);

  const handleToggleActive = useCallback(async (offer) => {
    await dispatch(updateAdminOffer({ id: offer.id, is_active: !offer.is_active }));
    dispatch(fetchAdminOffers());
  }, [dispatch]);

  if (loading && (!offers || offers.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading offers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offers & Discounts"
        subtitle={`Create and manage promotional offers (${filteredOffers.length} total)`}
        actions={(
          <Button onClick={() => navigate("/admin/offers/new")}>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Create Offer
          </Button>
        )}
      />

      <SearchField value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search offers..." className="max-w-md" />

      {filteredOffers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel py-12 text-center shadow-sm">
          <svg className="mx-auto h-12 w-12 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          <p className="mt-4 text-sm font-medium text-ink">No offers yet</p>
          <p className="mt-1 text-sm text-muted">Create your first promotional offer to attract more bookings.</p>
          <div className="mt-4"><Button onClick={() => navigate("/admin/offers/new")}>Create Offer</Button></div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredOffers.map((offer) => {
            const status = statusLabel(offer);
            return (
              <div key={offer.id} className="overflow-hidden rounded-3xl border border-border bg-panel shadow-sm transition-shadow hover:shadow-md">
                {/* Banner preview when show_banner is true */}
                {offer.show_banner && (
                  <div className="p-4">
                    <OfferBannerCanvas
                      offer={offer}
                      preview
                      className="min-h-[200px] sm:min-h-[240px]"
                    />
                  </div>
                )}

                <div className={`p-5 space-y-3 ${offer.show_banner ? "border-t border-border" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-ink">{offer.title}</h3>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.text}</span>
                      </div>
                      {offer.description && <p className="mt-0.5 text-xs text-muted line-clamp-2">{offer.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <span className="rounded-lg bg-brand-50 px-2 py-1 font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      {offer.discount_type === "percentage" ? `${offer.discount_value}%` : `$${offer.discount_value}`} OFF
                    </span>
                    {offer.tag_label && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {offer.tag_label}
                      </span>
                    )}
                    {offer.show_banner && (
                      <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        Campaign Banner
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted space-y-1">
                    <p>{dayjs(offer.start_date).format("MMM D, YYYY")} — {dayjs(offer.end_date).format("MMM D, YYYY")}</p>
                    {offer.room_id && <p>Room-specific</p>}
                    {offer.owner_id && !offer.room_id && <p>Owner-wide</p>}
                    {!offer.room_id && !offer.owner_id && <p>Site-wide</p>}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <button
                      onClick={() => navigate(`/admin/offers/${offer.id}/edit`)}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(offer)}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
                    >
                      {offer.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id)}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
