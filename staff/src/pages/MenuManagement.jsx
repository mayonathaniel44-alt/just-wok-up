import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  UtensilsCrossed,
  AlertCircle,
} from "lucide-react";
import "./MenuManagement.css";

const API_URL = "http://localhost:5000/api/menu";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  imageUrl: "",
  isAvailable: true,
};

function peso(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function MenuManagement() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [menuResponse, categoryResponse] = await Promise.all([
        fetch(`${API_URL}/manage`),
        fetch(`${API_URL}/categories`),
      ]);

      if (!menuResponse.ok || !categoryResponse.ok) {
        throw new Error("The server could not load the menu. Check the backend.");
      }

      const menuJson = await menuResponse.json();
      const categoryJson = await categoryResponse.json();

      if (!menuJson.success || !categoryJson.success) {
        throw new Error("The server returned an unsuccessful response.");
      }

      setItems(menuJson.data);
      setCategories(categoryJson.data);
    } catch (err) {
      setError(err.message || "Unable to connect to the menu API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const filteredItems = items.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(query) ||
      (item.description || "").toLowerCase().includes(query);

    const matchesCategory =
      categoryFilter === "all" ||
      String(item.categoryId) === categoryFilter;

    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && item.isAvailable) ||
      (availabilityFilter === "unavailable" && !item.isAvailable);

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  function openAddModal() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      categoryId: categories[0] ? String(categories[0].id) : "",
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      description: item.description || "",
      price: String(item.price ?? ""),
      categoryId: String(item.categoryId ?? ""),
      imageUrl: item.imageUrl || "",
      isAvailable: Boolean(item.isAvailable),
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveItem(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      categoryId: Number(form.categoryId),
      imageUrl: form.imageUrl.trim() || null,
      isAvailable: form.isAvailable,
    };

    if (
      !payload.name ||
      !Number.isFinite(payload.price) ||
      payload.price < 0 ||
      !payload.categoryId
    ) {
      setError("Enter a valid name, price, and category.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(
        editingId
          ? `${API_URL}/items/${editingId}`
          : `${API_URL}/items`,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save the menu item.");
      }

      setModalOpen(false);
      setNotice(editingId ? "Menu item updated." : "Menu item added.");
      await loadMenu();
    } catch (err) {
      setError(err.message || "Unable to save the menu item.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(item) {
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_URL}/items/${item.id}/availability`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isAvailable: !item.isAvailable }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Unable to update availability.");
      }

      const updatedAvailability =
        result.data?.isAvailable ?? !item.isAvailable;

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, isAvailable: updatedAvailability }
            : currentItem
        )
      );

      setNotice(
        `${item.name} marked ${
          updatedAvailability ? "available" : "unavailable"
        }.`
      );
    } catch (err) {
      setError(err.message || "Unable to update availability.");
    }
  }

  const availableCount = items.filter((item) => item.isAvailable).length;
  const unavailableCount = items.length - availableCount;

  return (
    <main className="menu-page">
      <header className="menu-heading">
        <div>
          <p className="menu-eyebrow">MENU & CATALOG</p>
          <h1>Menu Management</h1>
          <p className="menu-subtitle">
            Manage your café's menu, prices, and availability.
          </p>
        </div>

        <div className="menu-heading-actions">
          <button
            className="menu-button menu-button-secondary"
            type="button"
            onClick={loadMenu}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
          <button
            className="menu-button menu-button-primary"
            type="button"
            onClick={openAddModal}
          >
            <Plus size={18} />
            Add menu item
          </button>
        </div>
      </header>

      {error && (
        <div className="menu-alert menu-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div className="menu-alert menu-alert-success" role="status">
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="menu-stats">
        <article className="menu-stat-card">
          <span className="menu-stat-icon"><UtensilsCrossed size={20} /></span>
          <div><p>Total menu items</p><strong>{items.length}</strong></div>
        </article>
        <article className="menu-stat-card">
          <span className="menu-stat-dot available-dot" />
          <div><p>Available</p><strong>{availableCount}</strong></div>
        </article>
        <article className="menu-stat-card">
          <span className="menu-stat-dot unavailable-dot" />
          <div><p>Unavailable</p><strong>{unavailableCount}</strong></div>
        </article>
        <article className="menu-stat-card">
          <span className="menu-stat-icon"><UtensilsCrossed size={20} /></span>
          <div><p>Categories</p><strong>{categories.length}</strong></div>
        </article>
      </section>

      <section className="menu-catalog">
        <div className="menu-toolbar">
          <label className="menu-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search menu items..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by availability"
            value={availabilityFilter}
            onChange={(event) => setAvailabilityFilter(event.target.value)}
          >
            <option value="all">All availability</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>

        {loading ? (
          <div className="menu-empty-state">Loading menu from the database...</div>
        ) : filteredItems.length === 0 ? (
          <div className="menu-empty-state">
            <UtensilsCrossed size={30} />
            <h3>No menu items found</h3>
            <p>Try changing your search or filters, or add a menu item.</p>
          </div>
        ) : (
          <div className="menu-table-wrap">
            <table className="menu-table">
              <thead>
                <tr>
                  <th>Menu item</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Availability</th>
                  <th className="menu-actions-heading">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="menu-item-cell">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="menu-item-image" />
                        ) : (
                          <div className="menu-item-placeholder">
                            <UtensilsCrossed size={19} />
                          </div>
                        )}
                        <div className="menu-item-copy">
                          <strong>{item.name}</strong>
                          <span>{item.description || "No description"}</span>
                        </div>
                      </div>
                    </td>
                    <td>{item.categoryName || "Uncategorized"}</td>
                    <td className="menu-price">{peso(item.price)}</td>
                    <td>
                      <span className={`menu-status ${item.isAvailable ? "is-available" : "is-unavailable"}`}>
                        <span />
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td>
                      <div className="menu-row-actions">
                        <button
                          type="button"
                          className="menu-icon-button"
                          onClick={() => openEditModal(item)}
                          title="Edit item"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="menu-icon-button"
                          onClick={() => toggleAvailability(item)}
                          title={item.isAvailable ? "Mark unavailable" : "Mark available"}
                          aria-label={item.isAvailable ? `Mark ${item.name} unavailable` : `Mark ${item.name} available`}
                        >
                          {item.isAvailable ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="menu-table-footer">
          Showing {filteredItems.length} of {items.length} menu items
        </footer>
      </section>

      {modalOpen && (
        <div
          className="menu-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <section
            className="menu-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-modal-title"
          >
            <header className="menu-modal-header">
              <div>
                <p className="menu-eyebrow">MENU CATALOG</p>
                <h2 id="menu-modal-title">
                  {editingId ? "Edit menu item" : "Add menu item"}
                </h2>
              </div>
              <button
                className="menu-icon-button"
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </header>

            <form onSubmit={saveItem}>
              <label className="menu-form-field">
                Item name *
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="e.g. Iced Latte"
                  maxLength={150}
                  required
                />
              </label>

              <label className="menu-form-field">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  placeholder="Describe the item..."
                  rows={3}
                />
              </label>

              <div className="menu-form-grid">
                <label className="menu-form-field">
                  Price (₱) *
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={updateField}
                    placeholder="0.00"
                    required
                  />
                </label>

                <label className="menu-form-field">
                  Category *
                  <select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={updateField}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="menu-form-field">
                Image URL (optional)
                <input
                  name="imageUrl"
                  type="url"
                  value={form.imageUrl}
                  onChange={updateField}
                  placeholder="https://..."
                />
              </label>

              <label className="menu-availability-field">
                <input
                  name="isAvailable"
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={updateField}
                />
                <span>
                  <strong>Available for ordering</strong>
                  <small>Customers can see and order this item.</small>
                </span>
              </label>

              {error && (
                <div className="menu-alert menu-alert-error" role="alert">
                  {error}
                </div>
              )}

              <div className="menu-modal-actions">
                <button
                  className="menu-button menu-button-secondary"
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="menu-button menu-button-primary"
                  type="submit"
                  disabled={saving || categories.length === 0}
                >
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add item"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
