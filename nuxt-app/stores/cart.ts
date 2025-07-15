// stores/cart.ts
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'


export interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image?: string
}

export const useCartStore = defineStore('cart', () => {
  const cartItems = ref<CartItem[]>([])

  const deliveryMethod = ref<'ship' | 'pickup'>('ship')

  // ✅ Load from localStorage on store init (if client)
  if (import.meta.client) {
    const stored = localStorage.getItem('guest_cart')
    if (stored) cartItems.value = JSON.parse(stored)
  }

  // ✅ Auto-save to localStorage on changes
  watch(cartItems, (val) => {
    if (import.meta.client) {
      localStorage.setItem('guest_cart', JSON.stringify(val))
    }
  }, { deep: true })

  const addToCart = (item: CartItem) => {
    const existing = cartItems.value.find(i => i.id === item.id)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      cartItems.value.push({ ...item })
    }

    
  }


  if (import.meta.client) {
  const stored = localStorage.getItem('guest_cart')
  if (stored) cartItems.value = JSON.parse(stored)

  const savedDelivery = localStorage.getItem('delivery_method')
  if (savedDelivery === 'pickup' || savedDelivery === 'ship') {
    deliveryMethod.value = savedDelivery
  }
}

// Persist delivery method
watch(deliveryMethod, (val) => {
  if (import.meta.client) {
    localStorage.setItem('delivery_method', val)
  }
})

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
    deliveryMethod, // ✅
  }
})
