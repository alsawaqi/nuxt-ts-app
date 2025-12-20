// stores/cart.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useNuxtApp } from "#imports";
import { useUserStore } from "~/stores/user"; // adjust path/name to your user store

export interface CartItem {
  id: number;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  Product_Stock: number; // Add the stock field here
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
    return {
      id: Number(row.Products_Id ?? p.id),
      slug: p.Slug ?? p.Product_Slug ?? "",
      name: p.Product_Name ?? "",
      price: Number(p.Product_Price ?? 0),
      quantity: Number(row.Quantity ?? 0),

      // image: depends on what you return from Products model
      image: p.image?.Image_Path ?? undefined,

      weight: Number(p.Weight_Kg ?? p.Weight ?? 0),
      length: Number(p.Length_Cm ?? p.Length ?? 0),
      width: Number(p.Width_Cm ?? p.Width ?? 0),
      height: Number(p.Height_Cm ?? p.Height ?? 0),
      Product_Stock: Number(p.Product_Stock ?? 0),
    };
  };

  const setCartFromApi = (res: any) => {
    cartItems.value = (res?.data?.data || []).map(mapApiToCartItem);
  };

  // ---------- Public actions ----------
  const loadCart = async () => {
    if (!isAuthed.value) {
      loadGuest();
      return;
    }

    const res = await $axios.get("/api/cart", { withCredentials: true });
    cartItems.value = (res.data?.data || []).map(mapApiToCartItem);
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
      const idx = cartItems.value.findIndex((i) => i.id === product.id);
      if (idx >= 0 && cartItems.value[idx]) {
        cartItems.value[idx].quantity = quantity;
      } else {
        cartItems.value.push({ ...product, quantity });
      }
      saveGuest();
      return;
    }

    const res = await $axios.post(
      "/api/cart/item",
      { product_id: product.id, quantity },
      { withCredentials: true }
    );
    setCartFromApi(res);
  };

  const removeItem = async (productId: number) => {
    if (!isAuthed.value) {
      cartItems.value = cartItems.value.filter((i) => i.id !== productId);
      saveGuest();
      return;
    }

    await $axios.delete(`/api/cart/item/${productId}`, {
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
    const mergedMap = new Map<number, number>();
    for (const i of guest)
      mergedMap.set(i.id, Math.max(1, Math.floor(Number(i.quantity) || 1)));
    for (const i of cartItems.value)
      mergedMap.set(i.id, Math.max(1, Math.floor(Number(i.quantity) || 1)));

    const items = Array.from(mergedMap.entries()).map(
      ([product_id, quantity]) => ({ product_id, quantity })
    );
    if (!items.length) return;

    await $axios.post("/api/cart/sync", { items }, { withCredentials: true });

    clearGuestStorage();
    await loadCart();
  };

const addToCart = async (product: Omit<CartItem, "quantity">, addQty = 1) => {
  const qtyToAdd = Math.max(1, Math.floor(Number(addQty) || 1))

  // guest
  if (!isAuthed.value) {
    const existing = cartItems.value.find(i => i.id === product.id)
    if (existing) existing.quantity += qtyToAdd
    else cartItems.value.push({ ...product, quantity: qtyToAdd })
    saveGuest()
    return
  }

  // authed → increment in DB
  const res = await $axios.post(
    "/api/cart/add",
    { product_id: product.id, quantity: qtyToAdd },
    { withCredentials: true }
  )
  setCartFromApi(res)
}



  // ✅ total price (keep same API you already use)
  const totalPrice = () => {
    return cartItems.value.reduce((sum, i) => {
      return sum + Number(i.price || 0) * Number(i.quantity || 0);
    }, 0);
  };

  // ✅ set qty by product id (works for guest + logged-in)
  const updateQuantity = async (productId: number, quantity: number) => {
    const it = cartItems.value.find((i) => i.id === productId);
    if (!it) return;

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const { quantity: _q, ...product } = it; // remove quantity for typing
    await addOrSetQuantity(product, qty);
  };

  // ✅ increment/decrement (persisted)
 const incrementQty = async (productId: number) => {
  const it = cartItems.value.find((i) => i.id === productId);
  if (!it) return;

  // Check stock limit
  if (it.quantity < it.Product_Stock) {
    await updateQuantity(productId, it.quantity + 1);
  } else {
     
  }
};

const decrementQty = async (productId: number) => {
  const it = cartItems.value.find((i) => i.id === productId);
  if (!it) return;

  if (it.quantity > 1) {
    await updateQuantity(productId, it.quantity - 1);
  }
};

  // ✅ keep old names used by your page
  const removeFromCart = async (productId: number) => {
    await removeItem(productId);
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
    
    getVat,
    loadCart,
    addOrSetQuantity,
    
    addToCart,
    removeItem,
    syncGuestCartToDb,
    
    totalPrice,
    updateQuantity,
    incrementQty,

    decrementQty,
    removeFromCart,
    clearCart,
  };
});
