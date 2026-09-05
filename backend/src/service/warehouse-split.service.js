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
  const physicalItems = requestedItems.filter(item => item.lineType === 'hardware' && item.quantity > 0);

  if (physicalItems.length === 0) {
    return {
      splits: [],
      backorders: [],
      totalShipments: 0,
      totalShippingCost: 0
    };
  }

  // Deep clone warehouse available inventory to simulate allocations
  const inventoryState = {};
  for (const wh of warehouses) {
    inventoryState[wh.id] = { ...(wh.inventory || {}) };
  }

  // Step 1: Check if any SINGLE warehouse can fulfill 100% of all physical items
  const singleWarehouseCandidates = warehouses.filter(wh => {
    return physicalItems.every(item => (inventoryState[wh.id][item.productId] || 0) >= item.quantity);
  });

  if (singleWarehouseCandidates.length > 0) {
    // Sort by lowest shipping cost weight
    singleWarehouseCandidates.sort((a, b) => Number(a.shippingCostWeight) - Number(b.shippingCostWeight));
    const chosenWh = singleWarehouseCandidates[0];
    const shippingCost = Number((BASE_SHIPMENT_RATE * Number(chosenWh.shippingCostWeight)).toFixed(2));

    const itemsAllocated = physicalItems.map(item => ({
      quotationItemId: item.quotationItemId,
      productId: item.productId,
      fulfilledQty: item.quantity
    }));

    return {
      splits: [
        {
          warehouseId: chosenWh.id,
          warehouseName: chosenWh.name,
          warehouseCode: chosenWh.code,
          shippingCost,
          items: itemsAllocated
        }
      ],
      backorders: [],
      totalShipments: 1,
      totalShippingCost: shippingCost
    };
  }

  // Step 2: Multi-warehouse allocation algorithm
  // Track remaining needed quantities for each item
  const remainingDemand = {};
  for (const item of physicalItems) {
    remainingDemand[item.quotationItemId] = {
      quotationItemId: item.quotationItemId,
      productId: item.productId,
      qtyNeeded: item.quantity
    };
  }

  const warehouseAllocations = {}; // { [warehouseId]: Array<{ quotationItemId, productId, fulfilledQty }> }

  // Greedy loop: In each iteration, pick the warehouse that can satisfy the highest
  // volume of currently unfulfilled demand, tie-breaking by lowest shipping weight.
  while (true) {
    const unfulfilledList = Object.values(remainingDemand).filter(d => d.qtyNeeded > 0);
    if (unfulfilledList.length === 0) break;

    let bestWarehouse = null;
    let maxFulfillableUnits = 0;

    for (const wh of warehouses) {
      let fulfillableInWh = 0;
      for (const demand of unfulfilledList) {
        const availableInWh = inventoryState[wh.id][demand.productId] || 0;
        fulfillableInWh += Math.min(demand.qtyNeeded, availableInWh);
      }

      if (fulfillableInWh > maxFulfillableUnits) {
        maxFulfillableUnits = fulfillableInWh;
        bestWarehouse = wh;
      } else if (fulfillableInWh > 0 && fulfillableInWh === maxFulfillableUnits && bestWarehouse) {
        // Tie-breaker: cheaper shipping weight
        if (Number(wh.shippingCostWeight) < Number(bestWarehouse.shippingCostWeight)) {
          bestWarehouse = wh;
        }
      }
    }

    // If no warehouse can fulfill any remaining demand, we must stop and backorder the rest
    if (!bestWarehouse || maxFulfillableUnits === 0) {
      break;
    }

    // Allocate from bestWarehouse
    if (!warehouseAllocations[bestWarehouse.id]) {
      warehouseAllocations[bestWarehouse.id] = [];
    }

    for (const demand of unfulfilledList) {
      const availableInWh = inventoryState[bestWarehouse.id][demand.productId] || 0;
      const takeQty = Math.min(demand.qtyNeeded, availableInWh);

      if (takeQty > 0) {
        warehouseAllocations[bestWarehouse.id].push({
          quotationItemId: demand.quotationItemId,
          productId: demand.productId,
          fulfilledQty: takeQty
        });

        demand.qtyNeeded -= takeQty;
        inventoryState[bestWarehouse.id][demand.productId] -= takeQty;
      }
    }
  }

  // Compile final splits
  const splits = [];
  let totalShippingCost = 0;

  for (const wh of warehouses) {
    const allocs = warehouseAllocations[wh.id];
    if (allocs && allocs.length > 0) {
      const shippingCost = Number((BASE_SHIPMENT_RATE * Number(wh.shippingCostWeight)).toFixed(2));
      totalShippingCost += shippingCost;

      splits.push({
        warehouseId: wh.id,
        warehouseName: wh.name,
        warehouseCode: wh.code,
        shippingCost,
        items: allocs
      });
    }
  }

  // Compile backorders
  const backorders = [];
  for (const demand of Object.values(remainingDemand)) {
    if (demand.qtyNeeded > 0) {
      backorders.push({
        quotationItemId: demand.quotationItemId,
        productId: demand.productId,
        backorderQty: demand.qtyNeeded
      });
    }
  }

  return {
    splits,
    backorders,
    totalShipments: splits.length,
    totalShippingCost: Number(totalShippingCost.toFixed(2))
  };
}

/**
 * Validates a manual split submitted by a sales rep against live warehouse inventory
 */
export function validateManualSplit(requestedItems, manualSplits, warehouses) {
  const physicalItems = requestedItems.filter(item => item.lineType === 'hardware');
  const demandMap = {};
  for (const item of physicalItems) {
    demandMap[item.quotationItemId] = item.quantity;
  }

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
      if (line.fulfilledQty <= 0) {
        throw new Error(`Fulfilled quantity must be greater than 0 for item ${line.quotationItemId}`);
      }

      const available = wh.inventory[line.productId] || 0;
      if (line.fulfilledQty > available) {
        throw new Error(`Insufficient stock in warehouse '${wh.name}' for product. Requested: ${line.fulfilledQty}, Available: ${available}`);
      }

      fulfilledTotalPerItem[line.quotationItemId] = (fulfilledTotalPerItem[line.quotationItemId] || 0) + line.fulfilledQty;
    }
  }

  // Check for over-allocation
  for (const [itemId, totalFulfilled] of Object.entries(fulfilledTotalPerItem)) {
    const needed = demandMap[itemId] || 0;
    if (totalFulfilled > needed) {
      throw new Error(`Total allocated quantity (${totalFulfilled}) exceeds ordered quantity (${needed}) for item ${itemId}`);
    }
  }

  return true;
}
