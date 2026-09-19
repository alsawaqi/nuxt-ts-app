// stores/cart.ts
import { offerKey, offerSelection, sameOffer } from "~/utils/offerIdentity.js";
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useNuxtApp } from "#imports";
import { useUserStore } from "~/stores/user"; // adjust path/name to your user store
import { normalizeBulkTiers, resolveBulkTier } from "~/utils/bulkPricing.js";
import type { BulkPriceTier } from "~/utils/bulkPricing.js";
import { createLatestQuantityQueue } from "~/utils/latestQuantityQueue.js";

export interface CartItem {
  vendorOfferId?: number | null;
  sellerName?: string;
  isUnavailable?: boolean;
  id: number;
  slug: string;
  name: string;
  name_ar?: string;
  Product_Name?: string;
  Product_Name_Ar?: string;
  description?: string;
  price: number;
  originalPrice?: number;
  finalPrice?: number;
  discountAmount?: number;
  lineDiscountAmount?: number;
  hasDiscount?: boolean;
  activeDiscount?: any | null;
  quantity: number;
  image?: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  Product_Stock: number; // Add the stock field here

  // Quantity-tier bulk pricing (tier wins over product discounts, no stacking)
  bulkPrices?: BulkPriceTier[];
  hasBulkPrice?: boolean;
  bulkUnitPrice?: number | null;
  bulkTier?: { min_qty: number; max_qty: number | null } | null;
}

export const useCartStore = defineStore("cart", () => {
  const { $axios } = useNuxtApp() as any;
  const userStore = useUserStore();

  const cartItems = ref<CartItem[]>([]);
  const deliveryMethod = ref<"ship" | "pickup">("ship");
  const selectedLocationId = ref<number | null>(null);
  const selectedAddressId = ref<number | null>(null);
  const vat = ref<number>(0);

  const isAuthed = computed(() => !!userStore.user); // adjust if your store uses different field

  // ---------- Guest helpers ----------
  const loadGuest = () => {
    if (import.meta.env.SSR) return;
    try {
      const stored = localStorage.getItem("guest_cart");
      cartItems.value = stored ? JSON.parse(stored) : [];
    } catch {
      cartItems.value = [];
      localStorage.removeItem("guest_cart");
    }
  };
  const saveGuest = () => {
    if (import.meta.env.SSR) return;
    localStorage.setItem("guest_cart", JSON.stringify(cartItems.value));
  };

  const clearGuestStorage = () => {
    if (import.meta.env.SSR) return;
    localStorage.removeItem("guest_cart");
  };

  const totalItems = computed(() =>
    cartItems.value.reduce((sum, i) => sum + Number(i.quantity || 0), 0)
  );

  // ---------- API mapping ----------
  const mapApiToCartItem = (row: any): CartItem => {
    const p = row.product || {};
    const originalPrice = Number(p.Original_Price ?? p.Product_Price ?? 0);
    const finalPrice = Number(p.Product_Final_Price ?? p.Discounted_Price ?? p.Product_Price ?? 0);
    const discountAmount = Number(p.Discount_Amount ?? Math.max(originalPrice - finalPrice, 0));

    // Bulk pricing decorations from the cart API (attributes may live on the row or the product)
    const bulkPrices = normalizeBulkTiers(row.bulk_prices ?? p.bulk_prices ?? p.Bulk_Prices ?? p.bulkPrices ?? []);
    const hasBulkPrice = Boolean(row.Has_Bulk_Price ?? p.Has_Bulk_Price ?? false);
    const rawBulkUnitPrice = row.Bulk_Unit_Price ?? p.Bulk_Unit_Price ?? null;
    const rawBulkTier = row.Bulk_Tier ?? p.Bulk_Tier ?? null;

    return {
      id: Number(row.Products_Id ?? p.id),
      vendorOfferId: row.Vendor_Offer_Id ?? p.Vendor_Offer_Id ?? null,
      sellerName: p.Seller_Name ?? "ISC",
      isUnavailable: Boolean(row.is_unavailable),
      slug: p.Slug ?? p.Product_Slug ?? "",
      name: p.Product_Name ?? "",
      name_ar: p.Product_Name_Ar ?? "",
      Product_Name: p.Product_Name ?? "",
      Product_Name_Ar: p.Product_Name_Ar ?? "",
      description: p.Product_Description ?? "",
      price: finalPrice,
      originalPrice,
      finalPrice,
      discountAmount,
      lineDiscountAmount: discountAmount * Number(row.Quantity ?? 0),
      hasDiscount: Boolean(p.Has_Discount ?? discountAmount > 0),
      activeDiscount: p.Active_Discount ?? null,
      quantity: Number(row.Quantity ?? 0),

      // image: depends on what you return from Products model
      image: p.image?.Image_Path ?? undefined,

      weight: Number(p.Weight_Kg ?? p.Weight ?? 0),
      length: Number(p.Length_Cm ?? p.Length ?? 0),
      width: Number(p.Width_Cm ?? p.Width ?? 0),
      height: Number(p.Height_Cm ?? p.Height ?? 0),
      Product_Stock: Number(p.Product_Stock ?? 0),

      bulkPrices,
      hasBulkPrice,
      bulkUnitPrice: rawBulkUnitPrice === null || rawBulkUnitPrice === undefined ? null : Number(rawBulkUnitPrice),
      bulkTier: rawBulkTier
        ? {
            min_qty: Number(rawBulkTier.min_qty ?? rawBulkTier.Min_Qty ?? 1),
            max_qty: (rawBulkTier.max_qty ?? rawBulkTier.Max_Qty ?? null) === null
              ? null
              : Number(rawBulkTier.max_qty ?? rawBulkTier.Max_Qty),
          }
        : null,
    };
  };

  // ---------- Bulk pricing (mirror of the server rule: tier wins, no discount stacking) ----------
  // Prefer resolving from the tiers array (guest carts / product payloads); fall back to the
  // server-decorated Bulk_* attributes on authed cart rows (always fresh for the row quantity
  // because every quantity change round-trips through the API).
  const bulkTierFor = (i: CartItem): BulkPriceTier | null => {
    const resolved = resolveBulkTier(i.bulkPrices ?? [], Number(i.quantity || 0));
    if (resolved) return resolved;

    if ((i.bulkPrices ?? []).length === 0 && i.hasBulkPrice && i.bulkUnitPrice != null) {
      return {
        min_qty: Number(i.bulkTier?.min_qty ?? 1),
        max_qty: i.bulkTier?.max_qty ?? null,
        unit_price: Number(i.bulkUnitPrice),
      };
    }

    return null;
  };

  const hasBulkPricing = (i: CartItem): boolean => bulkTierFor(i) !== null;

  // Unit price actually charged for the line: tier price when a tier matches, else the
  // normal (possibly discounted) price.
  const effectiveUnitPrice = (i: CartItem): number => {
    const tier = bulkTierFor(i);
    return tier ? Number(tier.unit_price) : Number(i.price || 0);
  };

  const cartItemsFromApi = (res: any): CartItem[] =>
    (res?.data?.data || []).map(mapApiToCartItem);

  const setCartFromApi = (res: any) => {
    cartItems.value = cartItemsFromApi(res);
  };

  // Authenticated quantity changes are optimistic in the UI but remain
  // serialized and authoritative on the server. Rapid clicks are coalesced to
  // the latest absolute quantity, so an older response can never overwrite a
  // newer customer choice.
  const quantitySyncCount = ref(0);
  const quantitySyncPending = computed(() => quantitySyncCount.value > 0);

  let quantityQueue: ReturnType<typeof createLatestQuantityQueue<string, any>>;

  const setCartFromApiPreservingPending = (
    res: any,
    excludedProductId?: string
  ) => {
    const nextItems = cartItemsFromApi(res);

    for (const [productId, desiredQuantity] of quantityQueue.desiredEntries(excludedProductId)) {
      const pendingItem = nextItems.find((item) => offerKey(item) === productId);
      if (pendingItem) pendingItem.quantity = desiredQuantity;
    }

    cartItems.value = nextItems;
  };

  quantityQueue = createLatestQuantityQueue<string, any>({
    delayMs: 200,
    persist: async (productId, quantity) => $axios.post(
      "/api/cart/item",
      { ...offerSelection(productId), quantity },
      { withCredentials: true }
    ),
    onResult: (_productId, _quantity, res) => {
      setCartFromApiPreservingPending(res);
    },
    onError: async (productId, _error, state) => {
      try {
        const res = await $axios.get("/api/cart", { withCredentials: true });
        setCartFromApiPreservingPending(res, productId);
      } catch {
        if (state.lastResult) {
          setCartFromApiPreservingPending(state.lastResult, productId);
        } else {
          const item = cartItems.value.find((candidate) => offerKey(candidate) === productId);
          if (item) item.quantity = state.confirmed;
        }
      }
    },
    onPendingChange: (count) => {
      quantitySyncCount.value = count;
    },
  });

  // ---------- Public actions ----------
  const loadCart = async () => {
    if (!isAuthed.value) {
      loadGuest();
      return;
    }

    const res = await $axios.get("/api/cart", { withCredentials: true });
    setCartFromApiPreservingPending(res);
  };

  const getVat = async (): Promise<number> => {
    if (!isAuthed.value) return 0;

    const res = await $axios.get("/api/vat", { withCredentials: true });
    vat.value = Number(res.data?.vat || 0);
    return vat.value;
  }

  const addOrSetQuantity = async (
    product: Omit<CartItem, "quantity">,
    quantity: number
  ) => {
    if (!isAuthed.value) {
      const idx = cartItems.value.findIndex((i) => sameOffer(i, product));
      if (idx >= 0 && cartItems.value[idx]) {
        cartItems.value[idx].quantity = quantity;
      } else {
        cartItems.value.push({ ...product, quantity });
      }
      saveGuest();
      return;
    }

    const existing = cartItems.value.find((item) => sameOffer(item, product));
    const confirmedQuantity = Number(existing?.quantity ?? quantity);

    if (existing) {
      existing.quantity = quantity;
    } else {
      cartItems.value.push({ ...product, quantity });
    }

    await quantityQueue.enqueue(offerKey(product), quantity, confirmedQuantity);
  };

  const removeItem = async (productId: number, vendorOfferId: number | null = null) => {
    if (!isAuthed.value) {
      cartItems.value = cartItems.value.filter((i) => !sameOffer(i, { id: productId, vendorOfferId }));
      saveGuest();
      return;
    }

    await $axios.delete(`/api/cart/item/${productId}`, {
      params: { vendor_offer_id: vendorOfferId },
      withCredentials: true,
    });
    await loadCart();
  };

  // ✅ call this right after login success
  const syncGuestCartToDb = async () => {
    if (import.meta.env.SSR) return;
    if (!isAuthed.value) return;

    // merge localStorage + in-memory
    let guest: CartItem[] = [];
    try {
      const stored = localStorage.getItem("guest_cart");
      guest = stored ? JSON.parse(stored) : [];
    } catch {
      guest = [];
    }

    // include current memory cart too (dedupe by id, prefer latest quantity)
    const mergedMap = new Map<string, number>();
    for (const item of [...guest, ...cartItems.value]) {
      mergedMap.set(offerKey(item), Math.max(1, Math.floor(Number(item.quantity) || 1)));
    }
    const items = Array.from(mergedMap.entries()).map(([key, quantity]) => ({ ...offerSelection(key), quantity }));
    if (!items.length) return;

    await $axios.post("/api/cart/sync", { items }, { withCredentials: true });

    clearGuestStorage();
    await loadCart();
  };

const addToCart = async (product: Omit<CartItem, "quantity">, addQty = 1) => {
  const qtyToAdd = Math.max(1, Math.floor(Number(addQty) || 1))

  // guest
  if (!isAuthed.value) {
    const existing = cartItems.value.find(i => sameOffer(i, product))
    if (existing) existing.quantity += qtyToAdd
    else cartItems.value.push({ ...product, quantity: qtyToAdd })
    saveGuest()
    return
  }

  // authed → increment in DB
  const res = await $axios.post(
    "/api/cart/add",
    { product_id: product.id, vendor_offer_id: product.vendorOfferId ?? null, quantity: qtyToAdd },
    { withCredentials: true }
  )
  setCartFromApi(res)
}



  // ✅ total price (keep same API you already use)
  // Uses the effective unit price so bulk-tier lines match the server's lineSubtotal.
  const totalPrice = () => {
    return cartItems.value.reduce((sum, i) => {
      return sum + effectiveUnitPrice(i) * Number(i.quantity || 0);
    }, 0);
  };

  const totalOriginalPrice = () => {
    return cartItems.value.reduce((sum, i) => {
      return sum + Number(i.originalPrice ?? i.price ?? 0) * Number(i.quantity || 0);
    }, 0);
  };

  const totalDiscount = () => {
    return cartItems.value.reduce((sum, i) => {
      // Tier wins: product discounts do NOT stack on bulk-priced lines (unit_discount = 0)
      if (hasBulkPricing(i)) return sum;
      const unitDiscount = Number(i.discountAmount ?? Math.max(Number(i.originalPrice ?? i.price ?? 0) - Number(i.price ?? 0), 0));
      return sum + unitDiscount * Number(i.quantity || 0);
    }, 0);
  };

  // ✅ set qty by product id (works for guest + logged-in)
  const updateQuantity = async (productId: number, quantity: number, vendorOfferId: number | null = null) => {
    const it = cartItems.value.find((i) => sameOffer(i, { id: productId, vendorOfferId }));
    if (!it) return;

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const { quantity: _q, ...product } = it; // remove quantity for typing
    await addOrSetQuantity(product, qty);
  };

  // ✅ increment/decrement (persisted)
 const incrementQty = async (productId: number, vendorOfferId: number | null = null) => {
  const it = cartItems.value.find((i) => sameOffer(i, { id: productId, vendorOfferId }));
  if (!it) return;

  // Check stock limit
  if (it.quantity < it.Product_Stock) {
    await updateQuantity(productId, it.quantity + 1, vendorOfferId);
  } else {
     
  }
};

const decrementQty = async (productId: number, vendorOfferId: number | null = null) => {
  const it = cartItems.value.find((i) => sameOffer(i, { id: productId, vendorOfferId }));
  if (!it) return;

  if (it.quantity > 1) {
    await updateQuantity(productId, it.quantity - 1, vendorOfferId);
  }
};

  // ✅ keep old names used by your page
  const removeFromCart = async (productId: number, vendorOfferId: number | null = null) => {
    await removeItem(productId, vendorOfferId);
  };

  const clearCart = async () => {
    if (!isAuthed.value) {
      cartItems.value = [];
      saveGuest();
      return;
    }

    // if you implemented DELETE /api/cart/clear in Laravel:
    await $axios.delete("/api/cart/clear", { withCredentials: true });
    cartItems.value = [];
  };

  return {
    cartItems,
    deliveryMethod,
    selectedAddressId,
    selectedLocationId,
    totalItems,
    vat,
    quantitySyncPending,
    
    getVat,
    loadCart,
    addOrSetQuantity,
    
    addToCart,
    removeItem,
    syncGuestCartToDb,
    
    totalPrice,
    totalOriginalPrice,
    totalDiscount,
    bulkTierFor,
    hasBulkPricing,
    effectiveUnitPrice,
    isQuantitySyncing: (productId: number, vendorOfferId: number | null = null) => quantityQueue.isPending(offerKey({ id: productId, vendorOfferId })),
    updateQuantity,
    incrementQty,

    decrementQty,
    removeFromCart,
    clearCart,
  };
});
