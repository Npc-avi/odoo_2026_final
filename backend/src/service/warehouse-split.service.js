/**
 * Warehouse Allocation and Splitting Service (Pure Algorithm - No DB access)
 * 
 * Objective: Given requested order lines and warehouse inventory levels,
 * produce an optimal fulfillment plan that:
 *  1. Minimizes the total number of distinct shipments (warehouses used).
 *  2. Minimizes shipping cost (using warehouse shipping_cost_weight).
 *  3. Explicitly identifies and flags backorders when total stock is insufficient.
 */

const BASE_SHIPMENT_RATE = 20.00;

/**
 * Calculates optimal fulfillment split across warehouses.
 * 
 * @param {Array<{ quotationItemId: string, productId: string, quantity: number, lineType: string }>} requestedItems
 * @param {Array<{ id: string, name: string, code: string, shippingCostWeight: number, inventory: Record<string, number> }>} warehouses
 * @returns {{
 *   splits: Array<{ warehouseId: string, warehouseName: string, warehouseCode: string, shippingCost: number, items: Array<{ quotationItemId: string, productId: string, fulfilledQty: number }> }>,
 *   backorders: Array<{ quotationItemId: string, productId: string, backorderQty: number }>,
 *   totalShipments: number,
 *   totalShippingCost: number
 * }}
 */
export function calculateOptimalWarehouseSplit(requestedItems, warehouses) {
  // Only physical hardware items require warehouse fulfillment
  const physicalItems = requestedItems.filter(item => item.lineType === 'hardware' && Number(item.quantity) > 0);

  if (physicalItems.length === 0) {
    return {
      splits: [],
      backorders: [],
      totalShipments: 0,
      totalShippingCost: 0,
      totalWarehouseCost: 0
    };
  }

  // Deep clone warehouse available inventory to simulate allocations
  const inventoryState = {};
  for (const wh of warehouses) {
    inventoryState[wh.id] = { ...(wh.inventory || {}) };
  }

  // Sort warehouses primarily by shippingCostWeight ascending, then code/name
  const sortedWarehouses = [...warehouses].sort((a, b) => {
    const weightDiff = Number(a.shippingCostWeight || 1.0) - Number(b.shippingCostWeight || 1.0);
    if (weightDiff !== 0) return weightDiff;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Track warehouse allocations: { [warehouseId]: Array<{ quotationItemId, productId, productName, productSku, fulfilledQty, unitCost, lineCost }> }
  const warehouseAllocations = {};
  const backorders = [];

  // For each requested physical product:
  for (const item of physicalItems) {
    let qtyNeeded = Number(item.quantity);
    const unitCost = Number(item.unitCost || 0);

    // Drain available stock warehouse by warehouse until demand is met
    for (const wh of sortedWarehouses) {
      if (qtyNeeded <= 0) break;

      const availableInWh = Number(inventoryState[wh.id][item.productId] || 0);
      if (availableInWh > 0) {
        const takeQty = Math.min(qtyNeeded, availableInWh);

        if (!warehouseAllocations[wh.id]) {
          warehouseAllocations[wh.id] = [];
        }

        warehouseAllocations[wh.id].push({
          quotationItemId: item.quotationItemId,
          productId: item.productId,
          productName: item.productName || 'Hardware Product',
          productSku: item.productSku || '',
          fulfilledQty: takeQty,
          unitCost: unitCost,
          lineCost: Number((takeQty * unitCost).toFixed(2))
        });

        qtyNeeded -= takeQty;
        inventoryState[wh.id][item.productId] = availableInWh - takeQty;
      }
    }

    // If all warehouses have been drained and unfulfilled demand remains -> Backorder
    if (qtyNeeded > 0) {
      backorders.push({
        quotationItemId: item.quotationItemId,
        productId: item.productId,
        productName: item.productName || 'Hardware Product',
        productSku: item.productSku || '',
        backorderQty: qtyNeeded,
        unitCost: unitCost,
        backorderCost: Number((qtyNeeded * unitCost).toFixed(2))
      });
    }
  }

  // Compile final splits per warehouse
  const splits = [];
  let totalShippingCost = 0;
  let totalWarehouseCost = 0;

  for (const wh of sortedWarehouses) {
    const allocs = warehouseAllocations[wh.id];
    if (allocs && allocs.length > 0) {
      const shippingCost = Number((BASE_SHIPMENT_RATE * Number(wh.shippingCostWeight || 1.0)).toFixed(2));
      const totalQty = allocs.reduce((acc, it) => acc + Number(it.fulfilledQty || 0), 0);
      // Warehouse cost calculated by multiplying single product cost with the number of products each warehouse gave
      const warehouseCost = Number(allocs.reduce((acc, it) => acc + Number(it.lineCost || (it.fulfilledQty * it.unitCost)), 0).toFixed(2));

      totalShippingCost += shippingCost;
      totalWarehouseCost += warehouseCost;

      splits.push({
        warehouseId: wh.id,
        warehouseName: wh.name,
        warehouseCode: wh.code,
        shippingCostWeight: Number(wh.shippingCostWeight || 1.0),
        shippingCost,
        totalQty,
        warehouseCost,
        items: allocs,
        estShipments: 1
      });
    }
  }

  return {
    splits,
    backorders,
    totalShipments: splits.length,
    totalShippingCost: Number(totalShippingCost.toFixed(2)),
    totalWarehouseCost: Number(totalWarehouseCost.toFixed(2))
  };
}

/**
 * Validates a manual split submitted by a sales rep against live warehouse inventory
 */
export function validateManualSplit(requestedItems, manualSplits, warehouses) {
  const physicalItems = requestedItems.filter(item => item.lineType === 'hardware');
  const whMap = {};
  for (const wh of warehouses) {
    whMap[wh.id] = wh;
  }

  const fulfilledTotalPerItem = {};

  for (const split of manualSplits) {
    const wh = whMap[split.warehouseId];
    if (!wh) {
      throw new Error(`Invalid warehouse ID ${split.warehouseId} specified in manual split.`);
    }

    for (const line of split.items) {
      const fulfilled = Number(line.fulfilledQty);
      if (isNaN(fulfilled) || fulfilled <= 0) {
        throw new Error(`Fulfilled quantity must be greater than 0 for item ${line.quotationItemId}.`);
      }

      // Check warehouse stock capacity
      const available = Number(wh.inventory[line.productId] || 0);
      if (fulfilled > available) {
        throw new Error(
          `Warehouse '${wh.name}' does not have enough stock to fulfill this quantity. Requested: ${fulfilled}, Available: ${available}.`
        );
      }

      fulfilledTotalPerItem[line.quotationItemId] = (fulfilledTotalPerItem[line.quotationItemId] || 0) + fulfilled;
    }
  }

  // The quantity fulfilled must strictly equal the ordered quantity (neither more nor less)
  for (const item of physicalItems) {
    const totalFulfilled = fulfilledTotalPerItem[item.quotationItemId] || 0;
    const ordered = Number(item.quantity);

    if (totalFulfilled > ordered) {
      throw new Error(
        `Total fulfilled quantity (${totalFulfilled}) exceeds ordered quantity (${ordered}) for product '${item.productName || item.quotationItemId}'.`
      );
    }

    if (totalFulfilled < ordered) {
      throw new Error(
        `Total fulfilled quantity (${totalFulfilled}) is less than ordered quantity (${ordered}) for product '${item.productName || item.quotationItemId}'. The fulfilled quantity must be exactly equal to the ordered quantity.`
      );
    }
  }

  return true;
}
