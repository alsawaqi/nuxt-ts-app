<script setup lang="ts">
definePageMeta({
  layout: 'layouts',
  middleware: 'auth',
})

import { useCartStore } from '~/stores/cart'
import { ref, onMounted, computed, watch } from 'vue'
import { useOrderConfirmPdf } from '@/composables/useOrderConfirmPdf'
import { useLoyaltyStore } from '~/stores/loyalty'
import { fieldA11y } from '~/utils/accessibility.js'

// import { useToast } from 'vue-toastification'

const { user, isAuthenticated } = useAuth()
const { $axios, $r2Url } = useNuxtApp()
const { formatPhone } = usePhoneCountryCodes()
const { t, field, productName } = useStorefrontLocale()

const step = ref<'confirm' | 'payment'>('confirm')

const { buildPdfUrl } = useOrderConfirmPdf()

const pdfUrl = ref<string>('')
const isOrderPlaced = ref(false)

const onPrintPdf = () => {
  if (!pdfUrl.value) return
  if (!import.meta.client) return
  const w = window.open(pdfUrl.value, '_blank')
  w?.focus?.()
  w?.print?.()
}

// ---------------------
// Types
// ---------------------
type Basis = 'weight' | 'volume' | 'heavy'

interface SavedShippingOption {
  shipper_id: number
  destination_id: number
  basis: Basis
  currency: string
  total_price: number
  breakdown?: any | null
  shipper_name?: string | null
  quoted_at?: string | null
  expires_at?: string | null
}
interface SavedCheckoutPrefill {
  idempotencyKey?: string
  orderRef?: string
  deliveryMethod: 'ship' | 'pickup'
  addressId: number | null
  locationId: number | null     // ✅ ADD THIS
  shippingOption: SavedShippingOption | null
  totals: {
    currency: string
    original_subtotal?: number
    product_discount?: number
    subtotal: number
    shipping: number
    vat: number
    before_loyalty?: number
    loyalty_discount?: number
    grand: number
  }
  items: { id: number; slug?: string; qty: number; price: number; original_price?: number; discount_amount?: number; active_discount?: any | null }[]
  savedAt: string
}

interface Cod {
    cod_supported : boolean
}

interface LoyaltySummary {
  available_points: number
  points_earned: number
  points_redeemed: number
  redeem_points: number
  redeem_amount: number
  redemption_value_per_point: number
}

// ---------------------
// State
// ---------------------
const cart = useCartStore()
const loyaltyStore = useLoyaltyStore()
//const toast = useToast()

const isSubmitting = ref(false)
const isSuccess = ref(false)
const itemsOpen = ref(false)
const codsupported = ref<Cod | null>(null)
const loyaltySummary = ref<LoyaltySummary | null>(null)
const loyaltyLoading = ref(false)
const useLoyaltyPoints = ref(false)
const loyaltyPointsToRedeem = ref<number>(0)

const selectedAddress = ref<any>(null)
const saved = ref<SavedCheckoutPrefill | null>(null)
const CHECKOUT_IDEMPOTENCY_KEY = 'checkout_idempotency_key'
const CHECKOUT_IDEMPOTENCY_SIGNATURE = 'checkout_idempotency_signature'

const makeCheckoutIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

const ensureSavedIdempotencyKey = () => {
  if (!import.meta.client) {
    return saved.value?.idempotencyKey || makeCheckoutIdempotencyKey()
  }

  const key = saved.value?.idempotencyKey
    || localStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY)
    || makeCheckoutIdempotencyKey()

  localStorage.setItem(CHECKOUT_IDEMPOTENCY_KEY, key)

  if (saved.value && saved.value.idempotencyKey !== key) {
    saved.value.idempotencyKey = key
    localStorage.setItem('checkout_prefill', JSON.stringify(saved.value))
  }

  return key
}


 
const shippingAddressText = computed(() => {
  const a = selectedAddress.value
  return a
    ? `${a?.Contact_Person_Name || ''}\n${formatPhone(a?.Telephone_Country_Code, a?.Telephone)}\n` +
    `${field(a?.country, 'Country_Name') || ''}, ${field(a?.region, 'Region_Name') || ''}, ` +
    `${field(a?.district, 'District_Name') || ''}, ${field(a?.city, 'City_Name') || ''}`
    : '—'
})

const invoiceProductDescription = (item: any) => {
  const details = field(item, ['description', 'Product_Description']) || field(item.product, 'Product_Description')
  const discount = Number(item.discountAmount || item.discount_amount || item.unit_discount_amount || 0)
  const original = Number(item.originalPrice || item.original_price || item.original_unit_price || 0)
  const discountName = item.activeDiscount?.name || item.active_discount?.name || item.discount?.name
  const discountLine = discount > 0
    ? `Discount: ${discountName ? `${discountName} - ` : ''}saved OMR ${discount.toFixed(3)} each${original ? ` from OMR ${original.toFixed(3)}` : ''}`
    : ''
  return [productName(item) || item.product_name || t('common.products'), details, discountLine].filter(Boolean).join('\n')
}

const linesForPdf = (items: any[] = cart.cartItems) =>
  items.map((i) => ({
    description: invoiceProductDescription(i),
    qty: Number(i.quantity || i.qty || 0),
    unit: 'EA',
    unitPrice: Number(i.unit_price ?? i.price ?? 0),
    vatPct: 5,
  }))

// ---------------------
// Payment state
// ---------------------
type Brand = 'visa' | 'mastercard' | 'amex' | 'unknown'
const onlyDigits = (s: string) => (s || '').replace(/\D/g, '')
const detectBrand = (num: string): Brand => {
  const s = onlyDigits(num)
  if (/^4\d{0,15}$/.test(s)) return 'visa'
  if (/^(5[1-5]\d{0,14}|2(2[2-9]\d|[3-6]\d{2}|7[01]\d|720)\d{0,12})$/.test(s)) return 'mastercard'
  if (/^3[47]\d{0,13}$/.test(s)) return 'amex'
  return 'unknown'
}
const formatNumber = (raw: string): string => {
  const s = onlyDigits(raw)
  const b = detectBrand(s)
  return b === 'amex'
    ? s.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '))
    : s.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}
const MAX_DIGITS = 16
const onCardNumberInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, MAX_DIGITS)
  const formatted = formatNumber(digits)
  if (el.value !== formatted) el.value = formatted
  card.value.number = formatted
  requestAnimationFrame(() => el.setSelectionRange(formatted.length, formatted.length))
}
const formatExpiry = (raw: string) => {
  let d = raw.replace(/\D/g, '').slice(0, 4)
  if (d.length >= 1 && parseInt(d.charAt(0), 10) > 1) d = ('0' + d).slice(0, 4)
  let mm = d.slice(0, 2)
  let yy = d.slice(2, 4)
  if (mm.length === 2) {
    const m = parseInt(mm, 10)
    if (m === 0) mm = '01'
    else if (m > 12) mm = '12'
  }
  return yy ? `${mm}/${yy}` : (d.length > 2 ? `${mm}/` : mm)
}
const onExpiryInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  const formatted = formatExpiry(el.value)
  if (el.value !== formatted) el.value = formatted
  card.value.expiry = formatted
}





const paymentMethod = ref<'card' | 'cod' | 'transfer'>('card')
const deliveryMethods =  ref<any>('')
const triedSubmit = ref(false)
const card = ref({ number: '', name: '', expiry: '', cvc: '' })
const focusedBack = ref(false)
const transfer = ref({ reference: '', payerName: '' })
const transferValid = computed(() => Boolean(transfer.value.reference.trim() && transfer.value.payerName.trim()))
const luhn = (num: string) => {
  const s = (num || '').replace(/\D/g, '')
  if (!s) return false
  let sum = 0, dbl = false
  for (let i = s.length - 1; i >= 0; i--) {
    const char = s[i] ?? '0'
    let d = parseInt(char, 10)
    if (dbl) { d *= 2; if (d > 9) d -= 9 }
    sum += d; dbl = !dbl
  }
  return sum % 10 === 0
}
const brand = computed<Brand>(() => detectBrand(card.value.number))
const maskedNumber = computed(() => (formatNumber(card.value.number) || '•••• •••• •••• ••••').replace(/\d(?=\d{4})/g, '•'))
const nameDisplay = computed(() => (card.value.name || 'FULL NAME').toUpperCase().slice(0, 26))
const expiryDisplay = computed(() => card.value.expiry || 'MM/YY')
const cardValid = computed(() => {
  const numberStripped = card.value.number.replace(/\s+/g, '')
  const numberOk = numberStripped.length >= 13 && luhn(numberStripped)
  const nameOk = card.value.name.trim().length >= 3
  const expOk = /^((0[1-9])|(1[0-2]))\/\d{2}$/.test(card.value.expiry)
  const cvcOk = /^\d{3,4}$/.test(card.value.cvc)
  return numberOk && nameOk && expOk && cvcOk
})

// ---------------------
// Load saved prefill + address
// ---------------------
const fetchSelectedAddress = async (addressId: number | null) => {
  if (cart.deliveryMethod !== 'ship' || !addressId) return
  try {
    const res = await $axios.get(`/api/contacts/${addressId}`)
    selectedAddress.value = res.data
  } catch (error) {
    console.error('Failed to fetch selected address:', error)
  }
}

onMounted(async () => {
  try {
    const raw = localStorage.getItem('checkout_prefill')
    saved.value = raw ? JSON.parse(raw) as SavedCheckoutPrefill : null
  } catch {
    saved.value = null
  }

  if (!saved.value) {
    // nothing persisted, bounce back to cart
    return navigateTo('/cart')
  }

  console.log('Loaded saved checkout prefill:', saved.value?.shippingOption?.shipper_id)

  // sync cart method/addr for consistency
  cart.deliveryMethod = saved.value.deliveryMethod
  if (saved.value.addressId) cart.selectedAddressId = saved.value.addressId
  if (saved.value.locationId) cart.selectedLocationId = saved.value.locationId

  // If shipping required but no saved option, back to cart
  if (saved.value.deliveryMethod === 'ship' && !saved.value.shippingOption) {
    return navigateTo('/cart')
  }

  await fetchSelectedAddress(saved.value.addressId ?? null)
})

// ---------------------
// Totals (from saved blob; fallback to runtime if needed)
// ---------------------
const savedOriginalSubtotal = computed(() => Number(saved.value?.totals?.original_subtotal ?? cart.totalOriginalPrice().toFixed(3)))
const savedProductDiscount = computed(() => Number(saved.value?.totals?.product_discount ?? cart.totalDiscount().toFixed(3)))
const savedSubtotal = computed(() => Number(saved.value?.totals?.subtotal ?? cart.totalPrice().toFixed(3)))
const savedShippingCost = computed(() => Number(saved.value?.totals?.shipping ?? 0))
const savedVat = computed(() => Number(saved.value?.totals?.vat ?? ((savedSubtotal.value + savedShippingCost.value) * cart.vat)))
const savedGrand = computed(() => Number(saved.value?.totals?.grand ?? (savedSubtotal.value + savedShippingCost.value + savedVat.value)))
const availableLoyaltyPoints = computed(() => Number(loyaltySummary.value?.available_points ?? 0))
const loyaltyValuePerPoint = computed(() => Number(loyaltySummary.value?.redemption_value_per_point ?? 0))
const maxLoyaltyPointsForOrder = computed(() => {
  if (!loyaltyValuePerPoint.value || savedGrand.value <= 0) return 0
  return Math.max(0, Math.floor(savedGrand.value / loyaltyValuePerPoint.value))
})
const maxUsableLoyaltyPoints = computed(() => Math.min(availableLoyaltyPoints.value, maxLoyaltyPointsForOrder.value))
const effectiveLoyaltyPoints = computed(() => {
  if (!useLoyaltyPoints.value || !loyaltyValuePerPoint.value) return 0
  return Math.max(0, Math.min(Math.floor(Number(loyaltyPointsToRedeem.value || 0)), maxUsableLoyaltyPoints.value))
})
const loyaltyDiscount = computed(() => Number(Math.min(effectiveLoyaltyPoints.value * loyaltyValuePerPoint.value, savedGrand.value).toFixed(3)))
const payableGrand = computed(() => Number(Math.max(savedGrand.value - loyaltyDiscount.value, 0).toFixed(3)))
const loyaltyRuleLabel = computed(() => {
  const points = Number(loyaltySummary.value?.redeem_points || 0)
  const amount = Number(loyaltySummary.value?.redeem_amount || 0)
  if (!points || !amount) return 'Redemption is not configured yet.'
  return `${points.toLocaleString()} points = OMR ${amount.toFixed(3)}`
})

// For enabling the button (no shipping UI here; we trust saved)

const shippingOk = computed(() => {
 if (cart.deliveryMethod === 'pickup') {
    return Boolean(saved.value?.locationId ?? cart.selectedLocationId)
  }
   return Boolean(saved.value?.addressId && saved.value?.shippingOption)
})
const paymentOk = computed(() => {
  if (payableGrand.value <= 0) return true
  if (paymentMethod.value === 'card') return cardValid.value
  if (paymentMethod.value === 'transfer') return transferValid.value
  if (paymentMethod.value === 'cod') return true
  return false
})


const canSubmit = computed(() => shippingOk.value && paymentOk.value)
const cardInvalid = computed(() => triedSubmit.value && paymentMethod.value === 'card' && !cardValid.value)
const transferInvalid = computed(() => triedSubmit.value && paymentMethod.value === 'transfer' && !transferValid.value)

// ---------------------
// Qty handlers (unchanged)
// ---------------------
const incrementQty = (id: number) => {
  const item = cart.cartItems.find(i => i.id === id)
  if (item) item.quantity++
}
const decrementQty = (id: number) => {
  const item = cart.cartItems.find(i => i.id === id)
  if (item && item.quantity > 1) item.quantity--
}
const onQtyInputChange = (event: Event, id: number) => {
  const value = parseInt((event.target as HTMLInputElement).value)
  const item = cart.cartItems.find(i => i.id === id)
  if (!item) return
  item.quantity = isNaN(value) || value < 1 ? 1 : value
}

// Keep address in sync if method flips
watch(() => cart.deliveryMethod, (val) => {
  if (val !== 'ship') selectedAddress.value = null
  else fetchSelectedAddress(saved.value?.addressId ?? null)
})

watch([useLoyaltyPoints, loyaltyPointsToRedeem, maxUsableLoyaltyPoints], () => {
  if (!useLoyaltyPoints.value) return
  if (loyaltyPointsToRedeem.value < 0) loyaltyPointsToRedeem.value = 0
  if (loyaltyPointsToRedeem.value > maxUsableLoyaltyPoints.value) {
    loyaltyPointsToRedeem.value = maxUsableLoyaltyPoints.value
  }
})


const pickupLocationId = computed(() =>
  cart.deliveryMethod === 'pickup'
    ? (saved.value?.locationId ?? cart.selectedLocationId ?? null)
    : null
)

const fetchLoyaltySummary = async () => {
  loyaltyLoading.value = true
  try {
    const { data } = await $axios.get('/api/loyalty/summary', { withCredentials: true })
    loyaltySummary.value = data
  } catch (error) {
    console.error('Failed to fetch loyalty summary:', error)
  } finally {
    loyaltyLoading.value = false
  }
}

const applyMaxLoyalty = () => {
  if (!maxUsableLoyaltyPoints.value) return
  useLoyaltyPoints.value = true
  loyaltyPointsToRedeem.value = maxUsableLoyaltyPoints.value
}


 

// ---------------------
// Submit
// ---------------------
const submitOrder = async () => {
  if (cart.cartItems.length === 0 || isSubmitting.value) return
  if (!canSubmit.value) {
    triedSubmit.value = true
    return
  }

  isSubmitting.value = true

  try {


    const parseExp = (mmYY: string) => {
      const m = Number(mmYY.slice(0, 2)) || null
      const y = Number(mmYY.slice(3, 5))
      const year = isNaN(y) ? null : 2000 + y
      return { m, year }
    }
    const { m: exp_month, year: exp_year } = parseExp(card.value.expiry)

    const effectivePaymentMethod = payableGrand.value <= 0 ? 'loyalty' : paymentMethod.value
    const idempotencyKey = ensureSavedIdempotencyKey()
    const payment = {
      method: effectivePaymentMethod,
      currency: 'OMR',
      amount: Number(payableGrand.value.toFixed(3)),
      card: effectivePaymentMethod === 'card' ? {
        brand: brand.value,
        last4: onlyDigits(card.value.number).slice(-4),
        exp_month, exp_year
      } : null,
      transfer: effectivePaymentMethod === 'transfer' ? {
        reference: transfer.value.reference,
        payer_name: transfer.value.payerName
      } : null
    }

    const payload = {

      delivery_method: cart.deliveryMethod,
      location_id: pickupLocationId.value,
      shipping_cost: savedShippingCost.value,
      Customers_Contacts_Id: cart.deliveryMethod === 'ship' ? (saved.value?.addressId ?? null) : null,
      VAT: savedVat.value,
      idempotency_key: idempotencyKey,


      shipping_option: cart.deliveryMethod === 'ship' && saved.value?.shippingOption ? {
        shipper_id: saved.value.shippingOption.shipper_id,
        destination_id: saved.value.shippingOption.destination_id,
        basis: saved.value.shippingOption.basis,
        price: Number(saved.value.shippingOption.total_price),
        currency: saved.value.shippingOption.currency ?? 'OMR',
        quoted_at: saved.value.shippingOption.quoted_at ?? null,
        expires_at: saved.value.shippingOption.expires_at ?? null,
        // Optional: include any server totals you persisted
        // weight_kg: saved.value.totalsFromServer?.weight_kg,
        // volume_cbm: saved.value.totalsFromServer?.volume_cbm,
      } : null,

      total: {
        currency: 'OMR',
        subtotal: Number(savedSubtotal.value.toFixed(3)),
        shipping: Number(savedShippingCost.value.toFixed(3)),
        vat: Number(savedVat.value.toFixed(3)),
        before_loyalty: Number(savedGrand.value.toFixed(3)),
        loyalty_discount: Number(loyaltyDiscount.value.toFixed(3)),
        grand: Number(payableGrand.value.toFixed(3))
      },

      loyalty: {
        use_points: effectiveLoyaltyPoints.value > 0,
        points: effectiveLoyaltyPoints.value,
      },

      cart_items: cart.cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
        vat: 0,
      })),
      payment
    }

    const response = await $axios.post('/api/orders/place', payload, {
      withCredentials: true,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    })

   const orderCode = response.data?.order_code

    if (response.status === 200) {

      isOrderPlaced.value = true; 
      await loyaltyStore.refresh()
      let savedOrderDetails: any = null
      try {
        const detailsRes = await $axios.get(`/api/orders/${response.data?.order_id}/details`, { withCredentials: true })
        savedOrderDetails = detailsRes.data
      } catch (detailsError) {
        console.error('Order details fetch for PDF failed:', detailsError)
      }

      // 1) Build PDF *before* clearing the cart so item names/qtys appear
      try {
        const serverTotals = savedOrderDetails?.totals || response.data?.totals || {}
        const pdfSaved = {
          ...saved.value!,
          totals: {
            ...saved.value!.totals,
            originalSubtotal: Number(serverTotals.original_subtotal ?? saved.value!.totals.original_subtotal ?? 0),
            productDiscount: Number(serverTotals.product_discount ?? saved.value!.totals.product_discount ?? 0),
            subtotal: Number(serverTotals.subtotal ?? saved.value!.totals.subtotal ?? 0),
            shipping: Number(serverTotals.shipping ?? saved.value!.totals.shipping ?? 0),
            vat: Number(serverTotals.vat ?? saved.value!.totals.vat ?? 0),
            loyaltyDiscount: Number(serverTotals.loyalty_discount ?? loyaltyDiscount.value.toFixed(3)),
            grand: Number(serverTotals.grand ?? serverTotals.grand_total ?? payableGrand.value.toFixed(3)),
          },
        }

        const invoiceRef = orderCode || saved.value?.orderRef || `ISC-INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`

        pdfUrl.value = await buildPdfUrl({
          saved: pdfSaved, // uses your persisted totals/currency
          company: {
            name: 'Industrial Supplies Center LLC',
            address: 'PO BOX 39, M.C.C., PC: 101 101, Way No: 7715\nMabelah, Sanaiya, Muscat, Oman',
            phone: '+968 24460320',
            vat: 'OM1100033153'
          },
          buyer: {
            name: selectedAddress.value?.Contact_Person_Name || user?.value?.Customer_Full_Name || user?.value?.Company_Name || 'Customer',
            address: shippingAddressText.value
          },
          supplierContact: { name: 'IC', phone: '+968 93219447', email: 'motorsales@isc-depot.com' },
          buyerContact: selectedAddress.value
            ? { name: selectedAddress.value.Contact_Person_Name, phone: formatPhone(selectedAddress.value.Telephone_Country_Code, selectedAddress.value.Telephone), email: user?.value?.Email }
            : undefined,
          meta: {
            title: 'INVOICE',
            ref: invoiceRef,
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            bank: {
              accountName: 'INDUSTRIAL SUPPLIES CENTER LLC',
              accountNo: '1074-0105031-001',
              currency: saved.value?.totals?.currency || 'OMR',
              swift: 'NBOMOMRXXXX',
              bank: 'National Bank of Oman',
              branch: 'Corporate Branch, PO Box 751, PC: 112, Ruwi, Muscat, Sultanate of Oman'
            }
          },
          // Use cart items *now* (they’ll be cleared right after)
          lines: savedOrderDetails?.items?.length ? linesForPdf(savedOrderDetails.items) : linesForPdf()
        })
      } catch (e) {
        console.error('PDF build failed:', e)
        pdfUrl.value = '' // fallback
      }

      // 2) Now clean up the cart/localStorage
      await cart.clearCart()
      localStorage.removeItem('checkout_prefill')
      localStorage.removeItem(CHECKOUT_IDEMPOTENCY_KEY)
      localStorage.removeItem(CHECKOUT_IDEMPOTENCY_SIGNATURE)

      // 3) Show success section (which includes the PDF iframe)
      isSuccess.value = true
    }



  } catch (error) {
    console.error('Order submission failed:', error)
    //  toast.error('Failed to place order.')
  } finally {
    isSubmitting.value = false
  }
}




const bounceIfEmpty = () => {
  if (!isOrderPlaced.value && !cart.cartItems.length) {
    navigateTo('/cart')
  }
}


const getshippingcod = async (id: number) : Promise<void> => {
  try {
    const res = await $axios.get('/api/shipping/cod',{ params: { 'shipper_id': id } })
     codsupported.value = res.data
  } catch (error) {
    console.error('Failed to fetch shipping COD data:', error)
  }
}

 onMounted(async() => {
  bounceIfEmpty()

  // Load VAT and other onMounted logic
  cart.getVat()
  await fetchLoyaltySummary()

  if (!cart.cartItems.length) return navigateTo('/cart')

  const raw = localStorage.getItem('checkout_prefill')
  saved.value = raw ? JSON.parse(raw) : null

   
  deliveryMethods.value = saved.value?.deliveryMethod
   
   
   await getshippingcod(saved.value?.shippingOption?.shipper_id || 0);

    if (!saved.value) return navigateTo('/cart')
})


 
</script>

<template>

  <section class="max-w-screen-xl mx-auto px-4 py-8 bg-white animate-fade-in" v-if="isSuccess">
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-green-600 mb-2">{{ t('checkout.orderPlaced') }}</h2>
      <p class="text-gray-700">{{ t('checkout.thankYouPdf') }}</p>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-center gap-3 mb-4">
      <a v-if="pdfUrl" :href="pdfUrl" download="invoice.pdf"
        class="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
        {{ t('checkout.downloadInvoice') }}
      </a>
      <button v-if="pdfUrl" type="button" @click="onPrintPdf"
        class="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
        {{ t('checkout.print') }}
      </button>
      <NuxtLink to="/"
        class="inline-flex items-center rounded-md bg-gradient-to-r from-[#00bfa5] to-[#88c547] hover:from-[#00a891] hover:to-[#76b135] text-white px-4 py-2 text-sm font-semibold">
        {{ t('checkout.goHome') }}
      </NuxtLink>
    </div>

    <!-- PDF iframe -->
    <div class="rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
      <div v-if="pdfUrl">
        <iframe :src="pdfUrl" class="w-full" style="height:min(80vh,900px)" title="Order confirmation PDF"></iframe>
      </div>
      <div v-else class="p-6 text-center text-sm text-slate-500">
        {{ t('checkout.buildingPdf') }}
      </div>
    </div>
  </section>


  <!-- STEP 1: Confirmation -->
  <section v-else-if="step === 'confirm'" class="max-w-screen-xl mx-auto px-4 py-8 bg-white">
    <OrderConfirm v-if="step === 'confirm'" :orderRef="saved?.orderRef || 'ISC-…'"
      :invoiceDate="new Date().toLocaleDateString()" :supplier="{
        name: 'Industrial Supplies Center LLC',
        lines: ['PO BOX 39, M.C.C., PC: 101', '101, Way No: 7715', 'Mabelah, Sanaiya, Muscat, Oman']
      }" :deliveryMethod="saved?.deliveryMethod || cart.deliveryMethod"
      :pickupLocationId="(saved?.locationId ?? cart.selectedLocationId ?? null)" :shipping="(saved?.deliveryMethod === 'ship' && saved?.shippingOption) ? {
        shipper_id: saved.shippingOption.shipper_id,
        destination_id: saved.shippingOption.destination_id,
        basis: saved.shippingOption.basis,
        currency: saved.shippingOption.currency || 'OMR',
        total_price: saved.shippingOption.total_price || 0,
        breakdown: saved.shippingOption.breakdown || [],
        deliverymethod: (saved as any)?.shippingOption?.shipper_name || '—'
      } : null" :buyer="{
    name: user?.Company_Name || '—',
    lines: selectedAddress ? [
      selectedAddress?.street || '',
      `${field(selectedAddress?.city, 'City_Name') || ''}, ${field(selectedAddress?.district, 'District_Name') || ''}`,
      `${field(selectedAddress?.region, 'Region_Name') || ''}, ${field(selectedAddress?.country, 'Country_Name') || ''}`
    ].filter(Boolean) : ['—']
  }" :supplierContact="{ label: 'SUPPLIER CONTACT', name: 'Muhammed Shanid', phone: '+968 93219447', tel: '+968 24460320', email: 'motorsales@isc-depot.com' }"
      :buyerContact="selectedAddress ? { label: 'BUYER CONTACT', name: selectedAddress?.Contact_Person_Name, phone: formatPhone(selectedAddress?.Telephone_Country_Code, selectedAddress?.Telephone), email: user?.Email } : undefined"
      paymentTerms="60 Days" currency="OMR" supplierTin="OM1100033153" buyerVatin="—" supplierDoRef="—" buyerPoRef="—"
      deliveryTerms="DDP Muscat" :bank="{
        accountName: 'INDUSTRIAL SUPPLIES CENTER LLC',
        accountNumber: '1074-0105031-001',
        currency: 'OMR',
        swift: 'NBOMOMRXXXX',
        bankName: 'National Bank of Oman',
        bankAddress: 'Corporate Branch, PO Box 751, PC:112, Ruwi, Muscat, Sultanate of Oman'
      }" :items="cart.cartItems.map((i: { name: any; slug: any; id: any; quantity: any; price: any }, idx: number) => ({
        sl: idx + 1,
        description: invoiceProductDescription(i),
        qty: i.quantity,
        unit: 'EA',
        unitPrice: Number(i.price),
        totalExcl: Number(i.price) * Number(i.quantity),
        vatPct: 5,
        vatAmt: Number(i.price) * Number(i.quantity) * cart.vat,
        totalIncl: Number(i.price) * Number(i.quantity) * 1.05
      }))" :totals="{
        originalSubtotal: savedOriginalSubtotal,
        productDiscount: savedProductDiscount,
        taxable: savedSubtotal,
        vat: savedVat,
        grand: savedGrand
      }" :onConfirm="() => { step = 'payment' }" />



  </section>



  <section class="max-w-screen-xl mx-auto px-4 py-8 bg-white" v-else-if="step === 'payment'">
    <!-- Back link -->
    <div class="mb-4">
      <NuxtLink to="/cart" class="text-[#00bfa5] hover:underline text-sm">← {{ t('checkout.backToCart') }}</NuxtLink>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Left Column -->
      <div class="md:col-span-2 space-y-8">



        <!-- Products Review (Accordion) -->
        <div class="bg-[#f9f9f9] border border-gray-200 rounded-lg shadow-sm">
          <!-- Header / Toggle -->
          <button type="button" class="w-full flex items-center justify-between px-5 py-4"
            @click="itemsOpen = !itemsOpen" :aria-expanded="itemsOpen" aria-controls="order-items">
            <div class="flex items-center gap-2">
              <span class="text-lg font-semibold text-gray-800">{{ t('checkout.itemsInOrder') }}</span>
              <span class="text-xs text-gray-500">({{ cart.cartItems.length }})</span>
            </div>

            <!-- Chevron -->
            <svg class="h-5 w-5 text-gray-600 transition-transform duration-200" :class="itemsOpen ? 'rotate-180' : ''"
              viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z"
                clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Body -->
          <transition name="accordion">
	            <div v-show="itemsOpen" id="order-items" class="px-5 pb-5 overflow-hidden" role="region"
	              :aria-label="t('checkout.itemsInOrder')">
              <div v-for="item in cart.cartItems" :key="item.id"
                class="flex justify-between items-center border-t pt-4 pb-5 first:border-t-0">
                <div class="flex gap-4">
	                  <img :src="`${$r2Url}/${item.image}`" :alt="productName(item)" class="w-16 h-16 object-cover rounded border" />
                  <div class="text-sm">
                    <p class="font-semibold text-gray-800">{{ productName(item) }}</p>

                    <!-- Quantity + Buttons -->
                    <div class="flex items-center space-x-2 mt-1">

                      <span>{{ item.quantity }} Pc (s)</span>


                    </div>

                    <p class="text-xs text-gray-500 mt-1">{{ t('common.omr') }} {{ item.price }} / {{ t('product.each') }}</p>
                  </div>
                </div>

                <p class="text-sm font-semibold text-gray-800 whitespace-nowrap">
                  {{ t('common.omr') }} {{ (item.price * item.quantity).toFixed(2) }}
                </p>
              </div>
            </div>
          </transition>
        </div>


        <div class="bg-[#f9f9f9] border border-gray-200 rounded-lg p-5 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-semibold text-gray-800 text-lg">{{ t('checkout.useLoyalty') }}</h3>
              <p class="text-xs text-gray-500 mt-1">{{ loyaltyRuleLabel }}</p>
            </div>
            <div class="text-right text-sm">
              <div class="font-semibold text-[#00bfa5]">{{ availableLoyaltyPoints.toLocaleString() }}</div>
              <div class="text-xs text-gray-500">{{ t('checkout.availablePoints') }}</div>
            </div>
          </div>

          <div v-if="loyaltyLoading" role="status" class="mt-4 text-sm text-gray-500">{{ t('checkout.loadingLoyalty') }}</div>
          <div v-else-if="!availableLoyaltyPoints || !loyaltyValuePerPoint" role="status" class="mt-4 text-sm text-gray-500">
            {{ t('checkout.noLoyalty') }}
          </div>
          <div v-else class="mt-4 space-y-3">
            <label for="use-loyalty-points" class="flex items-center gap-2 text-sm text-gray-700">
              <input id="use-loyalty-points" type="checkbox" class="accent-[#00bfa5] focus-visible:ring-2 focus-visible:ring-[#00bfa5]/50" v-model="useLoyaltyPoints" />
              {{ t('checkout.redeemPoints') }}
            </label>

            <div v-if="useLoyaltyPoints" class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <label for="loyalty-points-to-redeem" class="sr-only">{{ t('checkout.loyaltyPointsLabel') }}</label>
              <input
                id="loyalty-points-to-redeem"
                v-model.number="loyaltyPointsToRedeem"
                type="number"
                min="0"
                :max="maxUsableLoyaltyPoints"
                step="1"
                :aria-label="t('checkout.loyaltyPointsLabel')"
                aria-describedby="loyalty-points-help"
                class="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/50"
              />
              <button type="button" @click="applyMaxLoyalty"
                class="rounded-lg border border-[#00bfa5] px-4 py-2 text-sm font-semibold text-[#00a891] hover:bg-teal-50">
                {{ t('checkout.useMax') }}
              </button>
            </div>
            <p v-if="useLoyaltyPoints" id="loyalty-points-help" class="text-xs text-gray-500">
              {{ t('checkout.maxPoints', { count: maxUsableLoyaltyPoints.toLocaleString() }) }}
            </p>

            <div v-if="useLoyaltyPoints" class="rounded-lg bg-white border px-3 py-2 text-sm text-gray-700">
              <div class="flex justify-between">
                <span>{{ t('checkout.pointsToRedeem') }}</span>
                <span>{{ effectiveLoyaltyPoints.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between mt-1">
                <span>{{ t('checkout.loyaltyDiscount') }}</span>
                <span class="font-semibold text-red-600">- {{ t('common.omr') }} {{ loyaltyDiscount.toFixed(3) }}</span>
              </div>
            </div>
          </div>
        </div>



        <div class="bg-[#f9f9f9] border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 class="font-semibold text-gray-800 text-lg mb-4">{{ t('checkout.choosePaymentMethod') }}</h3>

          <div
            v-if="cardInvalid || transferInvalid"
            id="payment-error-summary"
            role="alert"
            class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ t('checkout.paymentErrorSummary') }}
          </div>

          <div v-if="payableGrand <= 0" class="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            {{ t('checkout.coveredByLoyalty') }}
          </div>

          <!-- Accepted cards (badge row) -->
          <div v-if="payableGrand > 0 && paymentMethod === 'card'" class="flex items-center gap-2 text-xs text-gray-600 mb-3">
            <span>{{ t('checkout.weAccept') }}</span>
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded border bg-white">VISA</span>
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded border bg-white">Mastercard</span>
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded border bg-white">AmEx</span>
          </div>

          <!-- Accordion / radio list -->
          <div v-if="payableGrand > 0" class="space-y-3" role="radiogroup" :aria-label="t('checkout.choosePaymentMethod')">

            <!-- Credit Card -->
            <div class="border rounded-lg bg-white overflow-hidden">
              <label
                for="payment-card"
                class="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer"
                :class="paymentMethod === 'card' ? 'bg-teal-50/40' : ''">
                <div class="flex items-center gap-3">
                  <input
                    id="payment-card"
                    type="radio"
                    class="accent-[#00bfa5] focus-visible:ring-2 focus-visible:ring-[#00bfa5]/50"
                    value="card"
                    v-model="paymentMethod"
                    :aria-label="t('checkout.selectPayment', { method: t('checkout.payCard') })"
                    :aria-expanded="paymentMethod === 'card'"
                    aria-controls="payment-card-panel"
                  />
                  <span id="payment-card-label" class="font-medium text-gray-800">{{ t('checkout.payCard') }}</span>
                </div>
                <svg aria-hidden="true" class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </label>

              <transition name="fade">
                <div v-if="paymentMethod === 'card'" id="payment-card-panel" class="px-4 pb-4 pt-0 border-t" role="region" aria-labelledby="payment-card-label">
                  <!-- Card mock -->
                  <div class="relative w-full max-w-md mx-auto my-4 isc-perspective">

                    <div class="jp-card-container max-w-md mx-auto my-4">
                      <div class="jp-card" :class="[
                        focusedBack && 'jp-card-flipped',
                        brand !== 'unknown' && 'jp-card-identified',
                        brand && `jp-card-${brand}`   // 'visa' | 'mastercard' | 'amex'
                      ]">
                        <!-- FRONT -->
                        <div class="jp-card-front">
                          <!-- all logos present; CSS shows the active one via jp-card-<brand> on the root -->
                          <div class="jp-card-logo jp-card-visa"></div>
                          <div class="jp-card-logo jp-card-mastercard"></div>
                          <div class="jp-card-logo jp-card-amex"></div>

                          <div class="jp-card-lower">
                            <div class="jp-card-shiny"></div>
                            <div class="jp-card-number jp-card-display">{{ maskedNumber }}</div>
                            <div class="jp-card-name jp-card-display">{{ nameDisplay }}</div>
                            <div class="jp-card-expiry jp-card-display" data-before="month/year"
                              data-after="valid thru">
                              {{ expiryDisplay }}
                            </div>
                          </div>
                        </div>

                        <!-- BACK -->
                        <div class="jp-card-back">
                          <div class="jp-card-bar"></div>
                          <div class="jp-card-cvc jp-card-display">
                            {{ card.cvc || (brand === 'amex' ? '••••' : '•••') }}
                          </div>
                          <div class="jp-card-shiny"></div>
                        </div>
                      </div>
                    </div>

                  </div>

                  <!-- Inputs hooked to the preview -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label for="card-number" class="sr-only">{{ t('checkout.cardNumber') }}</label>
                      <input v-bind="fieldA11y({ id: 'card-number', invalid: cardInvalid, hint: true })" :value="card.number" @input="onCardNumberInput" inputmode="numeric" pattern="\d*"
                      autocomplete="cc-number" :placeholder="t('checkout.cardNumber')"
                      :class="['w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2', cardInvalid ? 'border-red-500 focus:ring-red-500/60' : 'border-gray-300 focus:ring-[#00bfa5]/50']" />
                      <p id="card-number-hint" class="sr-only">{{ t('checkout.cardNumberHint') }}</p>
                      <p v-if="cardInvalid" id="card-number-error" class="sr-only">{{ t('checkout.cardError') }}</p>
                    </div>
                    <div>
                      <label for="card-name" class="sr-only">{{ t('checkout.fullName') }}</label>
                      <input v-bind="fieldA11y({ id: 'card-name', invalid: cardInvalid })" v-model.trim="card.name" :placeholder="t('checkout.fullName')" autocomplete="cc-name"
                      :class="['w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2', cardInvalid ? 'border-red-500 focus:ring-red-500/60' : 'border-gray-300 focus:ring-[#00bfa5]/50']" />
                      <p v-if="cardInvalid" id="card-name-error" class="sr-only">{{ t('checkout.cardError') }}</p>
                    </div>
                    <div>
                      <label for="card-expiry" class="sr-only">MM/YY</label>
                      <input v-bind="fieldA11y({ id: 'card-expiry', invalid: cardInvalid, hint: true })" :value="card.expiry" @input="onExpiryInput" placeholder="MM/YY" inputmode="numeric"
                      autocomplete="cc-exp" maxlength="5"
                      :class="['w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2', cardInvalid ? 'border-red-500 focus:ring-red-500/60' : 'border-gray-300 focus:ring-[#00bfa5]/50']" />
                      <p id="card-expiry-hint" class="sr-only">{{ t('checkout.expiryHint') }}</p>
                      <p v-if="cardInvalid" id="card-expiry-error" class="sr-only">{{ t('checkout.cardError') }}</p>
                    </div>
                    <div>
                      <label for="card-cvc" class="sr-only">CVC</label>
                      <input v-bind="fieldA11y({ id: 'card-cvc', invalid: cardInvalid, hint: true })" v-model.trim="card.cvc" :maxlength="brand === 'amex' ? 4 : 3" placeholder="CVC"
                      inputmode="numeric" autocomplete="cc-csc" @focus="focusedBack = true" @blur="focusedBack = false"
                      :class="['w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2', cardInvalid ? 'border-red-500 focus:ring-red-500/60' : 'border-gray-300 focus:ring-[#00bfa5]/50']" />
                      <p id="card-cvc-hint" class="sr-only">{{ t('checkout.cvcHint') }}</p>
                      <p v-if="cardInvalid" id="card-cvc-error" class="sr-only">{{ t('checkout.cardError') }}</p>
                    </div>
                  </div>

                  <p v-if="cardInvalid" class="text-xs text-red-600 mt-2">
                    {{ t('checkout.cardError') }}
                  </p>
                </div>
              </transition>
            </div>

            <!-- Cash on Delivery -->
            <div class="border rounded-lg bg-white overflow-hidden" v-if="codsupported?.cod_supported || deliveryMethods==='pickup'">
              <label
                for="payment-cod"
                class="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer"
                :class="paymentMethod === 'cod' ? 'bg-teal-50/40' : ''">
                <div class="flex items-center gap-3">
                  <input
                    id="payment-cod"
                    type="radio"
                    class="accent-[#00bfa5] focus-visible:ring-2 focus-visible:ring-[#00bfa5]/50"
                    value="cod"
                    v-model="paymentMethod"
                    :aria-label="t('checkout.selectPayment', { method: t('checkout.cashOnDelivery') })"
                    :aria-expanded="paymentMethod === 'cod'"
                    aria-controls="payment-cod-panel"
                  />
                  <span id="payment-cod-label" class="font-medium text-gray-800">{{ t('checkout.cashOnDelivery') }}</span>
                </div>
                <svg aria-hidden="true" class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </label>

              <transition name="fade">
                <div v-if="paymentMethod === 'cod'" id="payment-cod-panel" class="px-4 pb-4 pt-0 border-t text-sm text-gray-600" role="region" aria-labelledby="payment-cod-label">
                  {{ t('checkout.codHelp') }}
                </div>
              </transition>
            </div>

            <!-- Bank Transfer -->
            <div class="border rounded-lg bg-white overflow-hidden">
              <label
                for="payment-transfer"
                class="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer"
                :class="paymentMethod === 'transfer' ? 'bg-teal-50/40' : ''">
                <div class="flex items-center gap-3">
                  <input
                    id="payment-transfer"
                    type="radio"
                    class="accent-[#00bfa5] focus-visible:ring-2 focus-visible:ring-[#00bfa5]/50"
                    value="transfer"
                    v-model="paymentMethod"
                    :aria-label="t('checkout.selectPayment', { method: t('checkout.bankTransfer') })"
                    :aria-expanded="paymentMethod === 'transfer'"
                    aria-controls="payment-transfer-panel"
                  />
                  <span id="payment-transfer-label" class="font-medium text-gray-800">{{ t('checkout.bankTransfer') }}</span>
                </div>
                <svg aria-hidden="true" class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </label>

              <transition name="fade">
                <div v-if="paymentMethod === 'transfer'" id="payment-transfer-panel" class="px-4 pb-4 pt-0 border-t" role="region" aria-labelledby="payment-transfer-label">
                  <div class="text-sm text-gray-700 space-y-2">
                    <p class="font-medium">{{ t('checkout.transferTo') }}</p>
                    <ul class="text-gray-600 text-sm">
                      <li>Bank: <span class="font-medium">Bank Muscat</span></li>
                      <li>Account Name: <span class="font-medium">Kasr Althqt LTljart EST</span></li>
                      <li>IBAN: <span class="font-medium">OMxx 0000 0000 0000 0000</span></li>
                    </ul>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label for="transfer-reference" class="sr-only">{{ t('checkout.transferReference') }}</label>
                      <input v-bind="fieldA11y({ id: 'transfer-reference', invalid: transferInvalid })" v-model.trim="transfer.reference" :placeholder="t('checkout.transferReference')"
                        :class="['w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2', transferInvalid ? 'border-red-500 focus:ring-red-500/60' : 'border-gray-300 focus:ring-[#00bfa5]/50']" />
                      <p v-if="transferInvalid" id="transfer-reference-error" class="sr-only">{{ t('checkout.transferError') }}</p>
                    </div>
                    <div>
                      <label for="transfer-payer-name" class="sr-only">{{ t('checkout.payerFullName') }}</label>
                      <input v-bind="fieldA11y({ id: 'transfer-payer-name', invalid: transferInvalid })" v-model.trim="transfer.payerName" :placeholder="t('checkout.payerFullName')"
                        :class="['w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2', transferInvalid ? 'border-red-500 focus:ring-red-500/60' : 'border-gray-300 focus:ring-[#00bfa5]/50']" />
                      <p v-if="transferInvalid" id="transfer-payer-name-error" class="sr-only">{{ t('checkout.transferError') }}</p>
                    </div>
                  </div>
                  <p v-if="transferInvalid" class="text-xs text-red-600 mt-2">
                    {{ t('checkout.transferError') }}
                  </p>
                </div>
              </transition>
            </div>
          </div>
        </div>



      </div>


      <!-- Right Column: Order Summary -->
      <div class="bg-gray-50 border rounded-lg p-5 shadow-sm">

        <h3 class="font-semibold text-gray-800 text-lg mb-1">{{ t('checkout.shippingTo') }}</h3>
        <p class="text-sm text-gray-600" v-if="selectedAddress">
          {{ selectedAddress.Contact_Person_Name }}<br>
          {{ formatPhone(selectedAddress.Telephone_Country_Code, selectedAddress.Telephone) }}<br>
          {{ field(selectedAddress.country, 'Country_Name') }}, {{ field(selectedAddress.region, 'Region_Name') }}, {{
            field(selectedAddress.district, 'District_Name') }} , {{ field(selectedAddress.city, 'City_Name') }},
        </p>
        <p class="text-sm text-gray-400" v-else>
          {{ t('checkout.noAddressSelected') }}
        </p>
        <br>
        <!-- Order Summary -->
        <h3 class="text-lg font-semibold mb-4">{{ t('checkout.orderSummary') }}</h3>
        <div class="space-y-2 text-sm text-gray-700">
          <div v-if="savedProductDiscount > 0" class="flex justify-between text-gray-500">
            <span>{{ t('cart.itemsBeforeDiscount') }}</span>
            <span>{{ t('common.omr') }} {{ savedOriginalSubtotal.toFixed(3) }}</span>
          </div>
          <div v-if="savedProductDiscount > 0" class="flex justify-between text-emerald-700">
            <span>{{ t('cart.productDiscount') }}</span>
            <span>- {{ t('common.omr') }} {{ savedProductDiscount.toFixed(3) }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ t('product.subTotal') }}</span>
            <span>{{ t('common.omr') }} {{ savedSubtotal.toFixed(3) }}</span>
          </div>

          <div class="flex justify-between">
            <span>{{ t('nav.shipping') }}</span>
            <span>{{ t('common.omr') }} {{ savedShippingCost.toFixed(3) }}</span>
          </div>
          <div class="flex justify-between">
            <span>VAT (5%)</span>
            <span>{{ t('common.omr') }} {{ savedVat.toFixed(3) }}</span>
          </div>
          <div v-if="loyaltyDiscount > 0" class="flex justify-between text-red-600">
            <span>{{ t('checkout.loyaltyDiscount') }}</span>
            <span>- {{ t('common.omr') }} {{ loyaltyDiscount.toFixed(3) }}</span>
          </div>
          <hr class="my-3" />
          <div class="flex justify-between font-semibold text-[#00bfa5] text-base">
            <span>{{ loyaltyDiscount > 0 ? t('checkout.totalPayable') : t('cart.total') }}</span>
            <span>{{ t('common.omr') }} {{ payableGrand.toFixed(3) }}</span>
          </div>
        </div>

        <p class="mt-4 text-xs leading-5 text-gray-600">
          {{ t('checkout.policyNotice').split('{terms}')[0] }}
          <NuxtLink to="/policies/terms" class="font-medium text-cyan-700 hover:text-cyan-900">{{ t('footer.terms') }}</NuxtLink>,
          <NuxtLink to="/policies/privacy" class="font-medium text-cyan-700 hover:text-cyan-900">{{ t('footer.privacy') }}</NuxtLink>,
          <NuxtLink to="/policies/shipping" class="font-medium text-cyan-700 hover:text-cyan-900">{{ t('policy.shipping') }}</NuxtLink>,
          <NuxtLink to="/policies/returns" class="font-medium text-cyan-700 hover:text-cyan-900">{{ t('policy.returns') }}</NuxtLink>.
        </p>

        <!-- Submit Order -->
        <button type="button" :disabled="isSubmitting || cart.cartItems.length === 0" :aria-describedby="(cardInvalid || transferInvalid) ? 'payment-error-summary' : undefined" @click="submitOrder" class="mt-5 w-full text-white font-semibold py-2 rounded-lg text-sm transition
            bg-[#e53935] hover:bg-[#c62828] disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed">
          <svg v-if="isSubmitting" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>{{ isSubmitting ? t('checkout.processing') : t('checkout.submitOrder') }}</span>
        </button>


      </div>
    </div>
  </section>
</template>
<style>
.isc-perspective {
  perspective: 1000px;
}

.isc-3d {
  transform-style: preserve-3d;
  position: relative;
}

/* ensures the back overlays the front */
.isc-rotY-180 {
  transform: rotateY(180deg);
}

.isc-backface-hide {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.isc-face {
  width: 100%;
  height: 11rem;
}
</style>
