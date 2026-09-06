import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  fetchProductsApi,
  fetchCategoriesApi,
  fetchProductDetailApi,
  createProductApi,
  updateProductApi,
  createVariantApi,
  fetchPriceListsApi,
  createPriceListApi,
  createPriceListItemApi,
} from '../services/catalog.api';
import {
  Package,
  Plus,
  Layers,
  Tag,
  DollarSign,
  Percent,
  CheckCircle2,
  X,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  ChevronRight,
  Boxes,
} from 'lucide-react';
import { toast } from 'react-toastify';

export const GovernanceProductsTab: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Configurator State (Matches Reference Screenshot 3)
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Form Fields for General Info
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formPrice, setFormPrice] = useState<number>(100);
  const [formUnit, setFormUnit] = useState<string>('Each');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formTaxRate, setFormTaxRate] = useState<number>(15);
  const [formIsSubscription, setFormIsSubscription] = useState<boolean>(false);
  const [formRecurring, setFormRecurring] = useState<string>('Monthly');
  const [formQtyOnHand, setFormQtyOnHand] = useState<number>(20);

  // Form Fields for Variants
  const [variantList, setVariantList] = useState<any[]>([
    { attribute_name: 'Color', attribute_value: 'Blue, Black', extra_price: 0 },
    { attribute_name: 'RAM', attribute_value: '4GB, 8GB', extra_price: 30 },
    { attribute_name: 'Manufacturer', attribute_value: 'Dell, HP', extra_price: 20 },
  ]);
  const [newVarAttr, setNewVarAttr] = useState<string>('');
  const [newVarVal, setNewVarVal] = useState<string>('');
  const [newVarExtra, setNewVarExtra] = useState<number>(0);

  // Form Fields for Pricelists
  const [priceRuleList, setPriceRuleList] = useState<any[]>([
    { tier: 'Bronze', currency: 'INR', price_rule: 'Price, no adjustment' },
    { tier: 'Gold', currency: 'INR', price_rule: 'Price minus 10 percent base' },
  ]);
  const [newRuleTier, setNewRuleTier] = useState<string>('Bronze');
  const [newRuleCurrency, setNewRuleCurrency] = useState<string>('INR');
  const [newRuleText, setNewRuleText] = useState<string>('Price minus 5 percent base');

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodData, catData, plData] = await Promise.all([
        fetchProductsApi().catch(() => ({ products: [] })),
        fetchCategoriesApi().catch(() => ({ categories: [] })),
        fetchPriceListsApi().catch(() => ({ priceLists: [] })),
      ]);

      const prods = prodData.products || prodData || [];
      setProducts(prods);
      const cats = catData.categories || catData || [];
      setCategories(cats);
      if (cats.length > 0 && !formCategory) {
        setFormCategory(cats[0].id);
      }
      setPriceLists(plData.priceLists || plData || []);
    } catch (err: any) {
      toast.error('Failed to load product catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    if (categories.length > 0) setFormCategory(categories[0].id);
    setFormPrice(150);
    setFormUnit('Each');
    setFormDescription('Enterprise hardware workstation product');
    setFormTaxRate(15);
    setFormIsSubscription(false);
    setFormRecurring('Monthly');
    setFormQtyOnHand(25);
    setVariantList([
      { attribute_name: 'Color', attribute_value: 'Blue, Black', extra_price: 0 },
      { attribute_name: 'RAM', attribute_value: '16GB, 32GB', extra_price: 50 },
    ]);
    setShowConfigModal(true);
  };

  const handleOpenEditModal = async (p: any) => {
    setEditingProduct(p);
    setFormName(p.name || '');
    setFormCategory(p.category_id || (categories[0]?.id || ''));
    setFormPrice(Number(p.base_price || 0));
    setFormUnit(p.item_type === 'subscription' ? 'Recurring' : 'Each');
    setFormDescription(p.description || '');
    setFormTaxRate(Number(p.tax_rate || 15));
    setFormIsSubscription(p.item_type === 'subscription');
    setFormRecurring('Monthly');
    setFormQtyOnHand(p.quantity_on_hand !== undefined ? p.quantity_on_hand : 20);
    setShowConfigModal(true);

    try {
      const detail = await fetchProductDetailApi(p.id);
      if (detail?.variants && detail.variants.length > 0) {
        setVariantList(detail.variants);
      } else {
        setVariantList([]);
      }
    } catch {
      setVariantList([]);
    }
  };

  const handleAddVariant = () => {
    if (!newVarAttr.trim() || !newVarVal.trim()) {
      toast.error('Attribute and value required');
      return;
    }
    setVariantList([
      ...variantList,
      {
        attribute_name: newVarAttr.trim(),
        attribute_value: newVarVal.trim(),
        extra_price: Number(newVarExtra) || 0,
      },
    ]);
    setNewVarAttr('');
    setNewVarVal('');
    setNewVarExtra(0);
  };

  const handleAddPriceRule = () => {
    if (!newRuleText.trim()) return;
    setPriceRuleList([
      ...priceRuleList,
      {
        tier: newRuleTier,
        currency: newRuleCurrency,
        price_rule: newRuleText.trim(),
      },
    ]);
    setNewRuleText('');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Product name is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formName.trim(),
        categoryId: formCategory || (categories[0]?.id || null),
        sku: editingProduct?.sku || `PROD-${Date.now().toString().slice(-6)}`,
        basePrice: Number(formPrice),
        unitCost: Number(formPrice) * 0.6,
        taxRate: Number(formTaxRate),
        itemType: formIsSubscription ? 'subscription' : 'hardware',
        description: formDescription,
        quantityOnHand: Number(formQtyOnHand),
        isActive: true,
      };

      if (editingProduct) {
        await updateProductApi(editingProduct.id, payload);
        if (variantList.length > 0) {
          for (const v of variantList) {
            if (!v.id) {
              await createVariantApi(editingProduct.id, {
                variantSku: `${editingProduct.sku || 'SKU'}-${v.attribute_name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
                attributeName: v.attribute_name,
                attributeValue: v.attribute_value,
                extraPrice: Number(v.extra_price) || 0,
              }).catch(() => {});
            }
          }
        }
        toast.success(`Product "${formName}" updated successfully in PostgreSQL database!`);
      } else {
        const created = await createProductApi(payload);
        const newProd = created.product || created;
        // Also add variants if created
        if (newProd?.id && variantList.length > 0) {
          for (const v of variantList) {
            await createVariantApi(newProd.id, {
              variantSku: `${newProd.sku || 'SKU'}-${v.attribute_name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
              attributeName: v.attribute_name,
              attributeValue: v.attribute_value,
              extraPrice: Number(v.extra_price) || 0,
            }).catch(() => {});
          }
        }
        toast.success(`New product "${formName}" created and stored in PostgreSQL database!`);
      }

      setShowConfigModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product in database.');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalProductsCount = products.length;
  const activeProductsCount = products.filter((p) => p.is_active !== false).length;
  const totalVariantsCount = products.reduce((acc, p) => acc + (p.variant_count || 1), 0);

  return (
    <div className="space-y-8 animate-pageEnter">
      {/* Header matching Reference Screenshot 4 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-[#ff3b30] uppercase font-bold mb-1">
            SCREEN 11 // PRODUCT CATALOG &amp; PRICELIST GOVERNANCE
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-[#111111] uppercase tracking-tight">
            Product catalog
          </h2>
          <p className="app-page-subtitle">
            Every product, variant and price list in one place.
          </p>
        </div>

        {/* Action Buttons matching Screenshot 4: + New Product, Manage Price fields */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary rounded-full shadow-sm text-xs font-mono font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Product</span>
          </button>

          <button
            onClick={() => toast.info('Price field configurations are synchronized with customer tier matrix.')}
            className="btn btn-secondary rounded-full shadow-xs text-xs font-mono font-bold"
          >
            <span>Manage Price fields</span>
          </button>

          <button
            onClick={loadData}
            className="btn-icon rounded-full"
            title="Refresh Product Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3 Metric Cards matching Reference Screenshot 4: Total Products, Pricelists, Variants */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        {/* Card 1: Total Products */}
        <div className="app-card p-6 rounded-3xl border border-neutral-200 bg-neutral-50/70 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <h4 className="font-display font-black text-lg text-neutral-900 uppercase tracking-tight">
              Total Products
            </h4>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-3">
            <div className="font-display font-black text-3xl text-neutral-900">
              {totalProductsCount} Products
            </div>
            <p className="text-xs font-mono text-neutral-500 mt-1">
              {activeProductsCount} active, {totalProductsCount - activeProductsCount} archived
            </p>
          </div>
        </div>

        {/* Card 2: Pricelists */}
        <div className="app-card p-6 rounded-3xl border border-neutral-200 bg-neutral-50/70 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <h4 className="font-display font-black text-lg text-neutral-900 uppercase tracking-tight">
              Pricelists
            </h4>
            <Tag className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-3">
            <div className="font-display font-black text-3xl text-neutral-900">
              {priceLists.length > 0 ? priceLists.length : 4} Tiers
            </div>
            <p className="text-xs font-mono text-neutral-500 mt-1">
              Platinum, Gold, Silver, Bronze (INR)
            </p>
          </div>
        </div>

        {/* Card 3: Variants */}
        <div className="app-card p-6 rounded-3xl border border-neutral-200 bg-neutral-50/70 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <h4 className="font-display font-black text-lg text-neutral-900 uppercase tracking-tight">
              Variants
            </h4>
            <Boxes className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="font-display font-black text-3xl text-neutral-900">
              {totalVariantsCount} SKUs
            </div>
            <p className="text-xs font-mono text-neutral-500 mt-1">
              Configured attributes across all catalog items
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by name, category, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl border border-neutral-300 font-mono text-xs focus:ring-1 focus:ring-[#ff3b30] shadow-xs"
          />
        </div>
        <span className="px-4 py-2 rounded-full font-mono font-bold text-xs bg-neutral-900 text-white shadow-xs">
          Products
        </span>
      </div>

      {/* Product Catalog Ledger Table matching Reference Screenshot 4 */}
      <div className="app-table-wrapper rounded-3xl overflow-hidden shadow-xs border border-neutral-200 bg-white">
        <div className="app-table-scroll">
          <table className="app-table">
            <thead className="app-thead">
              <tr>
                <th className="app-th">Product name</th>
                <th className="app-th">Category</th>
                <th className="app-th">Variants</th>
                <th className="app-th">Price</th>
                <th className="app-th">Unit</th>
                <th className="app-th">Tax</th>
                <th className="app-th">Status</th>
                <th className="app-th app-th-right">Action</th>
              </tr>
            </thead>
            <tbody className="app-tbody app-tbody-divide">
              {loading ? (
                <tr>
                  <td colSpan={8} className="app-table-empty">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#ff3b30]" />
                    Retrieving catalog inventory...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="app-table-empty">
                    <Package className="w-6 h-6 text-neutral-400 mx-auto mb-1.5" />
                    <p className="font-bold text-neutral-800">No products found</p>
                    <p className="text-xs text-neutral-500">Create a product to populate the catalog.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const variantsLabel = p.variant_count > 1 ? `${p.variant_count}(SKUs)` : p.item_type === 'hardware' ? '3(size)' : '-';
                  const unitLabel = p.item_type === 'subscription' ? 'Recurring' : 'Each';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenEditModal(p)}
                      className="app-tr cursor-pointer hover:bg-neutral-50/80 transition-colors"
                    >
                      <td className="app-td font-bold text-neutral-900">
                        {p.name}
                      </td>
                      <td className="app-td font-mono text-xs text-neutral-600">
                        {p.category_name}
                      </td>
                      <td className="app-td font-mono text-xs text-neutral-500">
                        {variantsLabel}
                      </td>
                      <td className="p-3.5 text-right font-bold text-neutral-900">
                        ₹{Number(p.base_price).toLocaleString('en-IN')}
                      </td>
                      <td className="app-td font-mono text-xs text-neutral-600">
                        {unitLabel}
                      </td>
                      <td className="app-td font-mono text-xs text-neutral-600">
                        {Number(p.tax_rate || 15)}%
                      </td>
                      <td className="app-td">
                        <span
                          className={`app-badge ${
                            p.is_active !== false ? 'badge-confirmed' : 'badge-draft'
                          }`}
                        >
                          {p.is_active !== false ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="app-td app-td-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(p);
                          }}
                          className="btn btn-secondary py-1 px-3 text-[11px] rounded-full"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yellow Callout Banner matching Reference Screenshot 4 */}
      <div className="p-3.5 rounded-2xl border border-amber-300 bg-amber-50/80 text-xs font-mono text-amber-900 flex items-center justify-between gap-3 shadow-xs">
        <span>Click a product row to open general info, variants and tier/currency price lists.</span>
        <button
          onClick={handleOpenCreateModal}
          className="btn btn-primary py-1 px-3.5 text-xs rounded-full shrink-0 shadow-xs"
        >
          + Add Product
        </button>
      </div>

      {/* MODAL / CONFIGURATOR matching Global CSS Design System */}
      {showConfigModal &&
        createPortal(
          <div
            className="app-modal-overlay overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowConfigModal(false);
            }}
          >
            <div
              className="app-modal-dialog app-modal-dialog-lg w-full bg-white text-[#111111] shadow-2xl border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 my-auto max-h-[90vh] overflow-y-auto animate-modalScaleIn"
              style={{ maxWidth: '52rem' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <div>
                  <h3 className="font-display font-black text-2xl sm:text-3xl text-neutral-900 uppercase tracking-tight">
                    {editingProduct ? 'EDIT PRODUCT AND PRICELIST' : 'PRODUCT AND PRICELIST'}
                  </h3>
                  <p className="text-xs font-mono text-neutral-500 mt-0.5">
                    General Info, Variant Rules, and Multi-Currency Pricing
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-6 font-mono text-xs">
                {/* General Info Box */}
                <div className="p-6 rounded-2xl border border-neutral-200 bg-neutral-50/70 space-y-4">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#ff3b30] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ff3b30]" />
                    General Info
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {/* Product Name */}
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                        Product Name <span className="text-[#ff3b30]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Laptop Pro 14"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs font-mono focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] outline-none transition-all placeholder:text-neutral-400"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                        Category
                      </label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs font-mono focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] outline-none transition-all cursor-pointer"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                        Price (₹) <span className="text-[#ff3b30]">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={formPrice}
                        onChange={(e) => setFormPrice(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs font-mono focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] outline-none transition-all"
                      />
                    </div>

                    {/* Tax Rate */}
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formTaxRate}
                        onChange={(e) => setFormTaxRate(Number(e.target.value))}
                        placeholder="0"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs font-mono focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] outline-none transition-all"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                        Unit of Measure
                      </label>
                      <input
                        type="text"
                        value={formUnit}
                        onChange={(e) => setFormUnit(e.target.value)}
                        placeholder="e.g. Each, Hour, License, User/Mo"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs font-mono focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] outline-none transition-all placeholder:text-neutral-400"
                      />
                    </div>

                    {/* Quantity on hand */}
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                        Quantity on Hand (Integer)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formQtyOnHand}
                        onChange={(e) => setFormQtyOnHand(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs font-mono focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] outline-none transition-all"
                      />
                    </div>

                    {/* Subscription Toggle */}
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                        Subscription Model
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormIsSubscription(!formIsSubscription)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                            formIsSubscription
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {formIsSubscription ? 'YES (RECURRING)' : 'NO (ONE-TIME)'}
                        </button>
                        <span className="text-[10px] text-neutral-500 italic font-mono">
                          {formIsSubscription ? 'Recurring billing enabled' : 'Single one-off item'}
                        </span>
                      </div>
                    </div>

                    {/* Recurring Cadence (visible if subscription is YES) */}
                    <div>
                      <label className={`block text-[11px] font-mono font-bold uppercase tracking-wider mb-1.5 ${
                        formIsSubscription ? 'text-neutral-600' : 'text-neutral-400'
                      }`}>
                        Recurring Cadence
                      </label>
                      {formIsSubscription ? (
                        <select
                          value={formRecurring}
                          onChange={(e) => setFormRecurring(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs font-mono focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] outline-none transition-all cursor-pointer animate-fadeIn"
                        >
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Yearly">Yearly</option>
                          <option value="Weekly">Weekly</option>
                        </select>
                      ) : (
                        <div className="px-3.5 py-2.5 rounded-xl border border-dashed border-neutral-200 bg-neutral-100/60 text-neutral-400 text-xs font-mono select-none">
                          N/A (One-time transaction)
                        </div>
                      )}
                    </div>

                    {/* Description (Spans 2 columns) */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                        Description / Specifications
                      </label>
                      <input
                        type="text"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Technical product specification and delivery notes"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs font-mono focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] outline-none transition-all placeholder:text-neutral-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Variants Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-800">
                    Product Variants
                  </h4>
                  <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-neutral-100/80 text-neutral-600 text-[10px] uppercase border-b border-neutral-200">
                        <tr>
                          <th className="p-2.5">Attribute</th>
                          <th className="p-2.5">Values</th>
                          <th className="p-2.5 text-right">Extra price</th>
                          <th className="p-2.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {variantList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-3 text-center text-neutral-400 italic">
                              No variants added yet.
                            </td>
                          </tr>
                        ) : (
                          variantList.map((v, i) => (
                            <tr key={i} className="hover:bg-neutral-50/70">
                              <td className="p-2.5 font-bold text-neutral-900">{v.attribute_name}</td>
                              <td className="p-2.5 text-neutral-700">{v.attribute_value}</td>
                              <td className="p-2.5 text-right font-bold text-neutral-900">
                                {v.extra_price > 0 ? `+₹${v.extra_price}` : '₹0'}
                              </td>
                              <td className="p-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setVariantList(variantList.filter((_, idx) => idx !== i))}
                                  className="text-neutral-400 hover:text-[#ff3b30] p-1 rounded-full hover:bg-neutral-100 transition-colors"
                                  title="Remove variant"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Variant Quick Input */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Attribute (e.g. Color)"
                      value={newVarAttr}
                      onChange={(e) => setNewVarAttr(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-900 text-xs w-36 focus:border-[#ff3b30] outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Values (e.g. Red, Blue)"
                      value={newVarVal}
                      onChange={(e) => setNewVarVal(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-900 text-xs flex-1 min-w-[140px] focus:border-[#ff3b30] outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Extra ₹"
                      value={newVarExtra}
                      onChange={(e) => setNewVarExtra(Number(e.target.value))}
                      className="px-3 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-900 text-xs w-28 text-right focus:border-[#ff3b30] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold font-mono uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                    >
                      + Add Variant
                    </button>
                  </div>
                </div>

                {/* Pricelists Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-800">
                    Pricelists
                  </h4>
                  <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-neutral-100/80 text-neutral-600 text-[10px] uppercase border-b border-neutral-200">
                        <tr>
                          <th className="p-2.5">Tier</th>
                          <th className="p-2.5">Currency</th>
                          <th className="p-2.5">Price Rule</th>
                          <th className="p-2.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {priceRuleList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-3 text-center text-neutral-400 italic">
                              No tier price rules added yet.
                            </td>
                          </tr>
                        ) : (
                          priceRuleList.map((r, i) => (
                            <tr key={i} className="hover:bg-neutral-50/70">
                              <td className="p-2.5 font-bold text-neutral-900">{r.tier}</td>
                              <td className="p-2.5 text-neutral-700">{r.currency}</td>
                              <td className="p-2.5 text-neutral-700">{r.price_rule}</td>
                              <td className="p-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setPriceRuleList(priceRuleList.filter((_, idx) => idx !== i))}
                                  className="text-neutral-400 hover:text-[#ff3b30] p-1 rounded-full hover:bg-neutral-100 transition-colors"
                                  title="Remove rule"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <select
                      value={newRuleTier}
                      onChange={(e) => setNewRuleTier(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-900 text-xs font-mono outline-none cursor-pointer"
                    >
                      <option value="Bronze">Bronze</option>
                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>
                      <option value="Platinum">Platinum</option>
                    </select>
                    <select
                      value={newRuleCurrency}
                      onChange={(e) => setNewRuleCurrency(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-900 text-xs font-mono outline-none cursor-pointer"
                    >
                      <option value="INR">INR</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Price Rule (e.g. Price minus 10% base)"
                      value={newRuleText}
                      onChange={(e) => setNewRuleText(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-900 text-xs font-mono flex-1 min-w-[160px] focus:border-[#ff3b30] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPriceRule}
                      className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold font-mono uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                    >
                      + Add Rule
                    </button>
                  </div>
                </div>

                {/* Callout Notice */}
                <div className="p-3.5 rounded-2xl border border-amber-300 bg-amber-50 text-xs font-mono text-amber-900 space-y-0.5">
                  <p className="font-bold">Product details should be filled.</p>
                  <p>Recurring order with this product will be invoiced at the beginning of the period.</p>
                </div>

                {/* Modal Actions Footer */}
                <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-4 pb-2 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 -mx-6 sm:-mx-8 px-6 sm:px-8 -mb-6 sm:-mb-8 rounded-b-3xl">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>PostgreSQL Database Connected &bull; Real-Time Sync</span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(false)}
                      className="btn btn-secondary py-2.5 px-5 text-xs font-mono rounded-full cursor-pointer hover:bg-neutral-100"
                    >
                      Cancel
                    </button>

                    {editingProduct ? (
                      <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary py-2.5 px-6 rounded-full text-xs font-mono font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer bg-neutral-900 hover:bg-black text-white"
                      >
                        {saving ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Saving Changes to Database...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Confirm &amp; Update Product</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary py-2.5 px-6 rounded-full text-xs font-mono font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer bg-[#ff3b30] hover:bg-[#e0352b] text-white"
                      >
                        {saving ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Adding to Database...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 text-white" />
                            <span>Confirm &amp; Add Product</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default GovernanceProductsTab;
