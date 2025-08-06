// stores/cart.ts
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface CartItem {
  id: number
  slug: string
  name: string
  price: number
  quantity: number
  image?: string
}

export const useCartStore = defineStore('cart', () => {
  const cartItems = ref<CartItem[]>([])
  const deliveryMethod = ref<'ship' | 'pickup'>('ship')
  const selectedAddressId = ref<number | null>(null) // ✅ NEW

  // ✅ Load from localStorage on store init
  if (import.meta.client) {
    const storedCart = localStorage.getItem('guest_cart')
    if (storedCart) cartItems.value = JSON.parse(storedCart)

    const savedDelivery = localStorage.getItem('delivery_method')
    if (savedDelivery === 'pickup' || savedDelivery === 'ship') {
      deliveryMethod.value = savedDelivery
    }

    const savedAddress = localStorage.getItem('selected_address_id')
    if (savedDelivery === 'ship' && savedAddress) {
      selectedAddressId.value = parseInt(savedAddress)
    }
  }

  // ✅ Auto-save cartItems
  watch(cartItems, (val) => {
    if (import.meta.client) {
      localStorage.setItem('guest_cart', JSON.stringify(val))
    }
  }, { deep: true })

  // ✅ Persist deliveryMethod
  watch(deliveryMethod, (val) => {
    if (!import.meta.client) return
    localStorage.setItem('delivery_method', val)

    // If method is not ship, remove saved address
    if (val !== 'ship') {
      selectedAddressId.value = null
      localStorage.removeItem('selected_address_id')
    }
  })

  // ✅ Persist selected address only if ship
  watch(selectedAddressId, (val) => {
    if (!import.meta.client) return
    if (deliveryMethod.value === 'ship' && val !== null) {
      localStorage.setItem('selected_address_id', val.toString())
    } else {
      localStorage.removeItem('selected_address_id')
    }
  })

  const addToCart = (item: CartItem) => {
    const existing = cartItems.value.find(i => i.id === item.id)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      cartItems.value.push({ ...item })
    }
  }

  const removeFromCart = (id: number) => {
    cartItems.value = cartItems.value.filter(i => i.id !== id)
  }

  const updateQuantity = (id: number, quantity: number) => {
    const item = cartItems.value.find(i => i.id === id)
    if (item && quantity > 0) {
      item.quantity = quantity
    }
  }

  const clearCart = () => {
    cartItems.value = []
  }

  const totalItems = () => cartItems.value.length
  const totalPrice = () => cartItems.value.reduce((sum, i) => sum + (i.price * i.quantity), 0)

  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    deliveryMethod,       // ✅ exposed
    selectedAddressId     // ✅ exposed
  }
})
