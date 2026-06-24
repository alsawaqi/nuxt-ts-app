<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import * as Toastification from 'vue-toastification'

type Option = { id: number; Country_Name?: string; Region_Name?: string; District_Name?: string; City_Name?: string }

type Address = {
  id: number
  Country_Id?: number | string
  Region_Id?: number | string
  District_Id?: number | string
  City_Id?: number | string
  Contact_Person_Name?: string
  Telephone_Country_Code?: string
  Telephone?: string
  Designation?: string
  Remarks?: string
  Email?: string
  Is_Default?: boolean | number
  is_default?: boolean
  country?: { Country_Name: string } | null
  region?: { Region_Name: string } | null
  district?: { District_Name: string } | null
  city?: { City_Name: string } | null
}

const { $axios } = useNuxtApp()
const { isAuthenticated } = useAuth()
const { t, field } = useStorefrontLocale()
const toast = Toastification.useToast()
const { phoneCountryCodes, digitsOnly, normalizePhoneCode, formatPhone } = usePhoneCountryCodes()
const toId = (v: any) => (v === null || v === undefined || v === '' ? '' : Number(v))

const selectCls =
  'w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm shadow-sm ' +
  'transition focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition ' +
  'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400';

const textareaCls = inputCls + ' resize-y';

 

// state
const addresses = ref<Address[]>([])
const loading = ref<boolean>(true)
const selectedId = ref<number | null>(null)

const countries = ref<Option[]>([])
const regions   = ref<Option[]>([])
const districts = ref<Option[]>([])
 
const cities    = ref<Option[]>([])

const modalOpen = ref(false)
const isEdit = ref(false)
const deleteOpen = ref(false)
const submitting = ref(false)
const defaultingId = ref<number | null>(null)
const deleteId = ref<number | null>(null)

// shared form for add/edit
const form = reactive({
  id: null as number | null,
  Country_Id: '' as number | string,
  Region_Id: '' as number | string,
  District_Id: '' as number | string,
  City_Id: '' as number | string,
  Contact_Person_Name: '',
  Telephone_Country_Code: '+968',
  Telephone: '',
  Designation: '',
  Remarks: '',
  Email: '',
  Type: 'shipping', // optional if your API expects it
})

const loadCountries = async () => {
  try {
    const res = await $axios.get('/api/countries')
    countries.value = res.data
  } catch (e) { console.error(e) }
}

const loadRegionsByCountry = async (countryId: number | string) => {
  regions.value = []
  if (!countryId) return
  try {
    const res = await $axios.get(`/api/regions/by-country/${countryId}`)
    regions.value = res.data
  } catch (e) { console.error(e) }
}

const loadDistrictsByRegion = async (regionId: number | string) => {
  districts.value = []
  if (!regionId) return
  try {
    const res = await $axios.get(`/api/districts/by-region/${regionId}`)
    districts.value = res.data
  } catch (e) { console.error(e) }
}

const loadCitiesByDistrict = async (districtId: number | string) => {
  cities.value = []
  if (!districtId) return
  try {
    const res = await $axios.get(`/api/cities/by-district/${districtId}`)
    cities.value = res.data
  } catch (e) { console.error(e) }
}

// reset helpers
const resetBelowCountry = () => {
  form.Region_Id = ''
  form.District_Id = ''
  form.City_Id = ''
  regions.value = []
  districts.value = []
  cities.value = []
}

const resetBelowRegion = () => {
  form.District_Id = ''
  form.City_Id = ''
  districts.value = []
  cities.value = []
}

const resetBelowDistrict = () => {
  form.City_Id = ''
  cities.value = []
}

// change handlers
const onCountryChange = async () => {
  resetBelowCountry()
  if (!form.Country_Id) return
  await loadRegionsByCountry(form.Country_Id)
}

const onRegionChange = async () => {
  resetBelowRegion()
  if (!form.Region_Id) return
  await loadDistrictsByRegion(form.Region_Id)
}

const onDistrictChange = async () => {
  resetBelowDistrict()
  if (!form.District_Id) return
  await loadCitiesByDistrict(form.District_Id)
}


// ------------ fetchers ------------
const fetchAddresses = async () => {
  if (!isAuthenticated.value) return
  loading.value = true
  try {
    const res = await $axios.get('/api/contacts')
    addresses.value = res.data || []
    // select default or first
    const def = addresses.value.find(a => isDefaultAddress(a))
    selectedId.value = def?.id ?? addresses.value[0]?.id ?? null
  } catch (e) {
    console.error('Failed to fetch addresses', e)
    toast.error(t('addresses.loadError'))
  } finally {
    loading.value = false
  }
}

 

// ------------ helpers ------------
const resetForm = () => {
  form.id = null
  form.Country_Id = ''
  form.Region_Id = ''
  form.District_Id = ''
  form.City_Id = ''
  form.Contact_Person_Name = ''
  form.Telephone_Country_Code = '+968'
  form.Telephone = ''
  form.Designation = ''
  form.Remarks = ''
  form.Email = ''
  form.Type = 'shipping'

  regions.value = []
  districts.value = []
  cities.value = []
}
const openAdd = async () => {
  isEdit.value = false
  resetForm()
  await ensureLookupsLoaded()
  modalOpen.value = true
}

const openEdit = async (addr: Address) => {
  isEdit.value = true
  resetForm()
  await ensureLookupsLoaded()

  form.id = addr.id

  // ✅ set country first (as number)
  form.Country_Id = toId(addr.Country_Id)
  await onCountryChange() // loads regions + resets below

  // ✅ then set region (as number)
  form.Region_Id = toId(addr.Region_Id)
  await onRegionChange() // loads districts + resets below

  // ✅ then set district (as number)
  form.District_Id = toId(addr.District_Id)
  await onDistrictChange() // loads cities + resets below

  // ✅ finally city
  form.City_Id = toId(addr.City_Id)

  form.Contact_Person_Name = addr.Contact_Person_Name || ''
  form.Telephone_Country_Code = normalizePhoneCode(addr.Telephone_Country_Code)
  form.Telephone = addr.Telephone || ''
  form.Designation = addr.Designation || ''
  form.Remarks = addr.Remarks || ''
  form.Email = addr.Email || ''

  modalOpen.value = true
}


const closeModal = () => {
  if (submitting.value) return
  modalOpen.value = false
}

 
 

const ensureLookupsLoaded = async () => {
  // load basic lists if empty
  if (!countries.value.length) await loadCountries()
 
}

const cleanTelephone = () => {
  form.Telephone = digitsOnly(form.Telephone)
}

const isDefaultAddress = (addr: Address) => Boolean(addr.is_default || addr.Is_Default)
const placeName = (source: unknown, key: string) => field(source, key)

// ------------ CRUD ------------
const submitAdd = async () => {
  submitting.value = true
  try {
    await $axios.post('/api/contacts', {
    Country_Id: form.Country_Id ? Number(form.Country_Id) : null,
Region_Id: form.Region_Id ? Number(form.Region_Id) : null,
District_Id: form.District_Id ? Number(form.District_Id) : null,
      City_Id: form.City_Id ? Number(form.City_Id) : null,
      Contact_Person_Name: form.Contact_Person_Name || null,
      Telephone_Country_Code: form.Telephone_Country_Code || null,
      Telephone: digitsOnly(form.Telephone) || null,
      Designation: form.Designation || null,
      Remarks: form.Remarks || null,
      Email: form.Email || null,
      Type: form.Type || null,
    })
    toast.success(t('addresses.saved'))
    modalOpen.value = false
    await fetchAddresses()
  } catch (e) {
    console.error('Failed to save address', e)
    toast.error(t('addresses.saveError'))
  } finally {
    submitting.value = false
  }
}

const submitEdit = async () => {
  if (!form.id) return
  submitting.value = true
  try {
    await $axios.put(`/api/contacts/${form.id}`, {
      Country_Id: form.Country_Id ? Number(form.Country_Id) : null,
Region_Id: form.Region_Id ? Number(form.Region_Id) : null,
District_Id: form.District_Id ? Number(form.District_Id) : null,
      City_Id: form.City_Id ? Number(form.City_Id) : null,
      Contact_Person_Name: form.Contact_Person_Name || null,
      Telephone_Country_Code: form.Telephone_Country_Code || null,
      Telephone: digitsOnly(form.Telephone) || null,
      Designation: form.Designation || null,
      Remarks: form.Remarks || null,
      Email: form.Email || null,
      Type: form.Type || null,
    })
    toast.success(t('addresses.updated'))
    modalOpen.value = false
    await fetchAddresses()
  } catch (e) {
    console.error('Failed to update address', e)
    toast.error(t('addresses.updateError'))
  } finally {
    submitting.value = false
  }
}

const requestDelete = (id: number) => {
  deleteId.value = id
  deleteOpen.value = true
}
const confirmDelete = async () => {
  if (!deleteId.value) return
  submitting.value = true
  try {
    await $axios.delete(`/api/contacts/${deleteId.value}`)
    toast.success(t('addresses.deleted'))
    deleteOpen.value = false
    deleteId.value = null
    await fetchAddresses()
  } catch (e) {
    console.error('Failed to delete address', e)
    toast.error(t('addresses.deleteError'))
  } finally {
    submitting.value = false
  }
}

const makeDefault = async (id: number) => {
  defaultingId.value = id
  try {
    await $axios.patch(`/api/contacts/${id}/default`)
    addresses.value = addresses.value.map(addr => ({
      ...addr,
      is_default: addr.id === id,
      Is_Default: addr.id === id,
    }))
    selectedId.value = id
    toast.success(t('addresses.defaultUpdated'))
    await fetchAddresses()
  } catch (e) {
    console.error('Failed to set default', e)
    toast.error(t('addresses.defaultError'))
  } finally {
    defaultingId.value = null
  }
}

const selectAddress = (id: number) => {
  selectedId.value = id
  // If you want selecting radio to also set default automatically, call:
  // makeDefault(id)
}


 

// ------------ mount ------------
onMounted(async () => {
  if (isAuthenticated.value) {
    await Promise.all([fetchAddresses(), ensureLookupsLoaded()])
  }
})
</script>


<template>
  <section class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">{{ t('addresses.title') }}</h2>
        <p class="text-xs text-slate-500">{{ t('addresses.subtitle') }}</p>
      </div>

      <button
        type="button"
        @click="openAdd()"
        class="inline-flex items-center gap-2 rounded-lg bg-cyan-600 text-white px-3.5 py-2 text-sm font-medium shadow hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-600"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>
        {{ t('addresses.new') }}
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="n in 4" :key="n" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="h-4 w-32 bg-slate-200 rounded mb-3"></div>
        <div class="h-3 w-full bg-slate-200 rounded mb-2"></div>
        <div class="h-3 w-2/3 bg-slate-200 rounded mb-2"></div>
        <div class="h-3 w-1/2 bg-slate-200 rounded"></div>
        <div class="mt-4 h-8 w-40 bg-slate-200 rounded"></div>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="!addresses || addresses.length === 0"
      class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"
    >
      <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        <svg viewBox="0 0 24 24" class="w-5 h-5 text-slate-500" fill="currentColor"><path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>
      </div>
      <p class="text-slate-700 font-medium">{{ t('addresses.empty') }}</p>
      <p class="text-slate-500 text-sm">{{ t('addresses.emptyHint') }}</p>
      <button
        @click="openAdd()"
        class="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 text-white px-3.5 py-2 text-sm font-medium hover:bg-cyan-700"
      >
        {{ t('addresses.add') }}
      </button>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label
        v-for="addr in addresses"
        :key="addr.id"
        class="group relative block cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-cyan-300 transition"
      >
        <!-- Selected ring -->
        <span
          class="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-cyan-500"
          v-show="selectedId === addr.id"
        />
        <!-- Header -->
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <input
              type="radio"
              name="selectedAddress"
              class="mt-1 h-4 w-4 text-cyan-600 border-slate-300"
              :value="addr.id"
              :checked="selectedId === addr.id"
              @change="selectAddress(addr.id)"
            />
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-slate-900 font-semibold">
                  {{ addr.Contact_Person_Name || t('addresses.recipient') }}
                </h3>
                <span
                  v-if="isDefaultAddress(addr)"
                  class="inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-0.5 text-[11px] font-medium"
                >
                  {{ t('addresses.default') }}
                </span>
              </div>
              <p class="text-xs text-slate-500">
                {{ addr.Email || '—' }}
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1">
            <button
              type="button"
              @click.stop="openEdit(addr)"
              class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              :title="t('addresses.edit')"
            >
              <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M3 17.25V21h3.75l11-11.03-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button
              type="button"
              @click.stop="requestDelete(addr.id)"
              class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              :title="t('addresses.delete')"
            >
              <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z"/></svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="mt-3 text-sm text-slate-700 space-y-1">
          <p class="leading-5">
           
          </p>
          <p class="leading-5">
            <span v-if="placeName(addr.city, 'City_Name')">{{ placeName(addr.city, 'City_Name') }}, </span>
            <span v-if="placeName(addr.district, 'District_Name')">{{ placeName(addr.district, 'District_Name') }}, </span>
            <span v-if="placeName(addr.region, 'Region_Name')">{{ placeName(addr.region, 'Region_Name') }}, </span>
            <span v-if="placeName(addr.country, 'Country_Name')">{{ placeName(addr.country, 'Country_Name') }}</span>
       
          </p>
          <div class="flex flex-wrap items-center gap-2 pt-1">
            <span v-if="addr.Telephone" class="inline-flex items-center gap-1 rounded-md bg-slate-50 ring-1 ring-slate-200 px-2 py-0.5 text-xs text-slate-700">
              <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="currentColor"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h2.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.01l-2.21 2.21z"/></svg>
              {{ formatPhone(addr.Telephone_Country_Code, addr.Telephone) }}
            </span>
            <button
              v-if="!isDefaultAddress(addr)"
              type="button"
              @click.stop="makeDefault(addr.id)"
              class="inline-flex items-center gap-1 rounded-md bg-white ring-1 ring-slate-200 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
              :disabled="defaultingId === addr.id"
            >
              <span v-if="defaultingId === addr.id" class="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"></span>
              {{ defaultingId === addr.id ? t('addresses.setting') : t('addresses.setDefault') }}
            </button>
          </div>
        </div>
      </label>
    </div>

    <!-- Add/Edit Modal -->
     <!-- Modal -->
<Transition
  enter-active-class="transition-opacity duration-200"
  enter-from-class="opacity-0"
  enter-to-class="opacity-100"
  leave-active-class="transition-opacity duration-150"
  leave-from-class="opacity-100"
  leave-to-class="opacity-0"
>
  <div
    v-if="modalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    @keydown.esc.prevent.stop="closeModal"
  >
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/40"></div>

    <!-- Panel -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-3 sm:translate-y-0 sm:scale-95"
      enter-to-class="opacity-100 translate-y-0 sm:scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 sm:scale-100"
      leave-to-class="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
    >
      <div
        v-show="modalOpen"
        class="relative w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
        role="dialog"
        aria-modal="true"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 class="text-lg font-semibold">
            {{ isEdit ? t('addresses.editTitle') : t('addresses.addTitle') }}
          </h3>
          <button
            @click="closeModal"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            :aria-label="t('common.close')"
          >
            ✕
          </button>
        </div>

        <!-- Body -->
        <form
          @submit.prevent="isEdit ? submitEdit() : submitAdd()"
          class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <!-- Country -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.country') }}</label>
            <div class="relative">
              <select
                v-model="form.Country_Id"
                @change="onCountryChange"
                :class="selectCls"
              >
                <option value="">{{ t('addresses.selectCountry') }}</option>
                <option v-for="c in countries" :key="c.id" :value="c.id">{{ placeName(c, 'Country_Name') }}</option>
              </select>
              <ChevronDown />
            </div>
          </div>

          <!-- Region -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.region') }}</label>
            <div class="relative">
              <select v-model="form.Region_Id" @change="onRegionChange" :class="selectCls">

                <option value="">{{ t('addresses.selectRegion') }}</option>
                <option v-for="r in regions" :key="r.id" :value="r.id">{{ placeName(r, 'Region_Name') }}</option>
              </select>
              <ChevronDown />
            </div>
          </div>

          <!-- District -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.district') }}</label>
            <div class="relative">
             <select v-model="form.District_Id" @change="onDistrictChange" :class="selectCls">
                <option value="">{{ t('addresses.selectDistrict') }}</option>
                <option v-for="d in districts" :key="d.id" :value="d.id">{{ placeName(d, 'District_Name') }}</option>
              </select>
              <ChevronDown />
            </div>
          </div>

          <!-- City -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.city') }}</label>
            <div class="relative">
              <select v-model="form.City_Id" :class="selectCls">
                <option value="">{{ t('addresses.selectCity') }}</option>
                <option v-for="ci in cities" :key="ci.id" :value="ci.id">{{ placeName(ci, 'City_Name') }}</option>
              </select>
              <ChevronDown />
            </div>
          </div>

          <!-- Contact Person -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.contactPerson') }}</label>
            <input v-model.trim="form.Contact_Person_Name" :class="inputCls" type="text" />
          </div>

          <!-- Telephone -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.telephone') }}</label>
            <div class="grid grid-cols-[120px,1fr] gap-2">
              <div class="relative">
                <select v-model="form.Telephone_Country_Code" :class="selectCls">
                  <option v-for="item in phoneCountryCodes" :key="item.code" :value="item.code">
                    {{ item.code }}
                  </option>
                </select>
                <ChevronDown />
              </div>
              <input
                v-model.trim="form.Telephone"
                :class="inputCls"
                type="tel"
                inputmode="numeric"
                pattern="[0-9]*"
                placeholder="9XXXXXXX"
                @input="cleanTelephone"
              />
            </div>
          </div>

          <!-- Designation -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.designation') }}</label>
            <select v-model="form.Designation" :class="selectCls">

            <option value="">{{ t('addresses.selectDesignation') }}</option>
                <option value="Mr">Mr</option>
                <option value="Ms">Ms</option>
                <option value="Mrs">Mrs</option>
                <option value="Dr">Dr</option>
                <option value="Prof">Prof</option>
                
                <option value="Sir">Sir</option>
                <option value="Eng">Eng</option>
                </select>

          </div>

          <!-- Email -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.email') }}</label>
            <input v-model.trim="form.Email" :class="inputCls" type="email" />
          </div>

          <!-- Remarks -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.remarks') }}</label>
            <textarea v-model.trim="form.Remarks" :class="textareaCls" rows="3"></textarea>
          </div>

          <!-- Footer -->
          <div class="md:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" @click="closeModal" class="px-4 py-2 rounded-lg ring-1 ring-slate-200 hover:bg-slate-50">
              {{ t('common.cancel') }}
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-cyan-500 to-teal-600 hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
              :disabled="submitting"
            >
              <span v-if="submitting" class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              {{ isEdit ? t('addresses.saveChanges') : t('common.save') }}
            </button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</Transition>


    <!-- Delete confirm -->
    <transition name="fade">
      <div v-if="deleteOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
          <div class="flex items-start gap-3">
            <div class="mt-0.5 rounded-full bg-red-50 p-2 ring-1 ring-red-200">
              <svg viewBox="0 0 24 24" class="w-5 h-5 text-red-600" fill="currentColor"><path d="M11 15h2v2h-2v-2m0-8h2v6h-2V7m1-5a10 10 0 1010 10A10 10 0 0012 2z"/></svg>
            </div>
            <div>
              <h3 class="font-semibold text-slate-900">{{ t('addresses.deleteTitle') }}</h3>
              <p class="text-sm text-slate-600">{{ t('addresses.deleteHelp') }}</p>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-end gap-2">
            <button class="rounded-md bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200 hover:bg-slate-50" @click="deleteOpen=false">
              {{ t('common.cancel') }}
            </button>
            <button class="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700" @click="confirmDelete" :disabled="submitting">
              <span v-if="submitting" class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              {{ t('addresses.delete') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>


<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
