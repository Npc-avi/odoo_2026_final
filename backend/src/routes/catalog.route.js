import { Router } from 'express';
import {
  listCategories,
  addCategory,
  listProducts,
  getProductDetail,
  addProduct,
  editProduct,
  addVariant,
  listPriceLists,
  addPriceList,
  addPriceListItem,
  listUpsellRules,
  addUpsellRule,
  listPortalCatalog
} from '../controller/catalog.controller.js';
import {
  validateCreateCategory,
  validateCreateProduct,
  validateCreateVariant,
  validateUpsellRule
} from '../validation/catalog.validator.js';
import { verifyStaffToken, verifyPortalToken, requireStaffRole } from '../middleware/auth.middleware.js';

const router = Router();

// ==========================================
// Customer Portal Catalog (Read-Only View)
// ==========================================
router.get('/portal', verifyPortalToken, listPortalCatalog);

// ==========================================
// Staff Catalog Endpoints
// ==========================================
router.use(verifyStaffToken);

// Categories
router.get('/categories', listCategories);
router.post('/categories', requireStaffRole('admin', 'sales_manager'), validateCreateCategory, addCategory);

// Products
router.get('/products', listProducts);
router.get('/products/:id', getProductDetail);
router.post('/products', requireStaffRole('admin', 'sales_manager'), validateCreateProduct, addProduct);
router.patch('/products/:id', requireStaffRole('admin', 'sales_manager'), editProduct);

// Variants
router.post('/products/:id/variants', requireStaffRole('admin', 'sales_manager'), validateCreateVariant, addVariant);

// Price Lists
router.get('/price-lists', listPriceLists);
router.post('/price-lists', requireStaffRole('admin', 'sales_manager'), addPriceList);
router.post('/price-lists/:id/items', requireStaffRole('admin', 'sales_manager'), addPriceListItem);

// Upsell Rules
router.get('/upsell-rules', listUpsellRules);
router.post('/upsell-rules', requireStaffRole('admin', 'sales_manager'), validateUpsellRule, addUpsellRule);

export default router;
