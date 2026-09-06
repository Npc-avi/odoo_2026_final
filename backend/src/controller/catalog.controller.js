import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import { getCached, setCached, delCached } from '../config/redis.js';
import {
  getCategories,
  createCategory,
  getProductsStaff,
  getProductByIdStaff,
  createProduct,
  updateProduct,
  getVariantsByProduct,
  createVariant,
  getPriceLists,
  createPriceList,
  setPriceListItem,
  getUpsellRules,
  createUpsellRule,
  getPortalCatalog
} from '../repository/catalog.repository.js';

// Categories with Cache-Aside pattern (1 hour TTL)
export async function listCategories(req, res, next) {
  try {
    const cacheKey = `catalog:categories:${req.actor.tenantId}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({ categories: cached });
    }

    const categories = await withTenantContext(req.actor, async (client) => {
      return getCategories(client);
    });

    await setCached(cacheKey, categories, 3600);
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function addCategory(req, res, next) {
  try {
    const category = await withTenantContext(req.actor, async (client) => {
      return createCategory(client, req.actor.tenantId, req.body);
    });

    // Invalidate categories cache
    await delCached(`catalog:categories:${req.actor.tenantId}`);

    return res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

// Products (Staff) with Cache-Aside pattern (1 hour TTL)
export async function listProducts(req, res, next) {
  try {
    const cacheKey = `catalog:products:${req.actor.tenantId}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({ products: cached });
    }

    const products = await withTenantContext(req.actor, async (client) => {
      return getProductsStaff(client);
    });

    await setCached(cacheKey, products, 3600);
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json({ products });
  } catch (err) {
    next(err);
  }
}

export async function getProductDetail(req, res, next) {
  try {
    const { id } = req.params;
    const data = await withTenantContext(req.actor, async (client) => {
      const product = await getProductByIdStaff(client, id);
      if (!product) return null;
      const variants = await getVariantsByProduct(client, id);
      return { product, variants };
    });

    if (!data) {
      const err = new Error('Product not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function addProduct(req, res, next) {
  try {
    const product = await withTenantContext(req.actor, async (client) => {
      return createProduct(client, req.actor.tenantId, req.body);
    });

    // Invalidate products cache
    await delCached(`catalog:products:${req.actor.tenantId}`);

    return res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function editProduct(req, res, next) {
  try {
    const { id } = req.params;
    const product = await withTenantContext(req.actor, async (client) => {
      return updateProduct(client, id, req.body);
    });

    if (!product) {
      const err = new Error('Product not found.');
      err.status = 404;
      return next(err);
    }

    // Invalidate products cache
    await delCached(`catalog:products:${req.actor.tenantId}`);

    return res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
}

// Variants
export async function addVariant(req, res, next) {
  try {
    const { id } = req.params; // product_id
    const variant = await withTenantContext(req.actor, async (client) => {
      return createVariant(client, req.actor.tenantId, id, req.body);
    });
    return res.status(201).json({ variant });
  } catch (err) {
    next(err);
  }
}

// Price Lists
export async function listPriceLists(req, res, next) {
  try {
    const priceLists = await withTenantContext(req.actor, async (client) => {
      return getPriceLists(client);
    });
    return res.status(200).json({ priceLists });
  } catch (err) {
    next(err);
  }
}

export async function addPriceList(req, res, next) {
  try {
    const priceList = await withTenantContext(req.actor, async (client) => {
      return createPriceList(client, req.actor.tenantId, req.body);
    });
    return res.status(201).json({ priceList });
  } catch (err) {
    next(err);
  }
}

export async function addPriceListItem(req, res, next) {
  try {
    const { id } = req.params; // price_list_id
    const item = await withTenantContext(req.actor, async (client) => {
      return setPriceListItem(client, req.actor.tenantId, id, req.body);
    });
    return res.status(200).json({ item });
  } catch (err) {
    next(err);
  }
}

// Upsell Rules
export async function listUpsellRules(req, res, next) {
  try {
    const rules = await withTenantContext(req.actor, async (client) => {
      return getUpsellRules(client);
    });
    return res.status(200).json({ rules });
  } catch (err) {
    next(err);
  }
}

export async function addUpsellRule(req, res, next) {
  try {
    const rule = await withTenantContext(req.actor, async (client) => {
      return createUpsellRule(client, req.actor.tenantId, req.body);
    });
    return res.status(201).json({ rule });
  } catch (err) {
    next(err);
  }
}

// Safe Customer Portal Catalog
export async function listPortalCatalog(req, res, next) {
  try {
    const rows = await withTenantContext(req.actor, async (client) => {
      return getPortalCatalog(client);
    });

    // Structure flat catalog view rows into product objects with variant arrays
    const productMap = new Map();
    for (const row of rows) {
      if (!productMap.has(row.product_id)) {
        productMap.set(row.product_id, {
          id: row.product_id,
          categoryId: row.category_id,
          sku: row.sku,
          name: row.name,
          description: row.description,
          itemType: row.item_type,
          basePrice: row.base_price,
          taxRate: row.tax_rate,
          isPromoted: row.is_promoted,
          variants: []
        });
      }
      if (row.variant_id) {
        productMap.get(row.product_id).variants.push({
          id: row.variant_id,
          attributeName: row.attribute_name,
          attributeValue: row.attribute_value,
          extraPrice: row.extra_price
        });
      }
    }

    return res.status(200).json({
      catalog: Array.from(productMap.values())
    });
  } catch (err) {
    next(err);
  }
}
