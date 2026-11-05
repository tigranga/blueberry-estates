// ============ CONFIG ============
// Replace with your Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_REPLACE_ME';

// Endpoints (Cloudflare Pages Functions)
const CHECKOUT_ENDPOINT = '/api/create-checkout-session';
const BLOCKED_ENDPOINT = '/api/blocked-dates';
const BOOKINGS_ENDPOINT = '/api/bookings';

const NIGHTLY_RATE = 24900; // $249.00 in cents
// ================================

const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

function calculateNights(checkin, checkout) {
  if (!checkin || !checkout) return 0;
  const start = new Date(checkin);
  const end = new Date(checkout);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

async function loadBlockedDates() {
  try {
    const res = await fetch(BLOCKED_ENDPOINT);
    if (res.ok) return await res.json();
  } catch (e) { console.warn('Could not load blocked dates', e); }
  return [];
}

let siteCalendar = null;
let contentLoaded = false;

function hostCalendar() {
  if (siteCalendar) return siteCalendar;
  if (contentLoaded) return null;
  try { return JSON.parse(localStorage.getItem('hostCalendar') || 'null'); } catch { return null; }
}

async function applyPublishedListing(listing) {
  if (!listing) return;
  const title = document.getElementById('listing-title');
  if (title && listing.title) title.textContent = listing.title;
  const loc = document.getElementById('listing-location');
  if (loc && listing.location) loc.textContent = `Entire home in ${listing.location}`;
  const guests = document.getElementById('listing-guests');
  if (guests && listing.guests) guests.textContent = `${listing.guests} guests`;
  const beds = document.getElementById('listing-bedrooms');
  if (beds && listing.bedrooms) beds.textContent = `${listing.bedrooms} bedrooms`;
  const priceEl = document.getElementById('nightly-price');
  if (priceEl && listing.price) priceEl.textContent = `$${listing.price}`;
  if (listing.desc) {
    const box = document.getElementById('listing-description');
    if (box) {
      const paras = box.querySelectorAll('p');
      if (paras[0]) paras[0].textContent = listing.desc;
      for (let i = 1; i < paras.length; i++) paras[i].remove();
    }
  }
  const photos = ((listing.photos && listing.photos.length) ? listing.photos : (listing.photo ? [listing.photo] : []))
    .filter((url) => url && !/muscache\.com|airbnb\.com/i.test(url));
  const already = document.querySelectorAll('#all-photos img').length;
  if (photos.length < 2 || photos.length < already) return false;
  const gallery = document.querySelector('.gallery');
  const thumbs = photos.slice(1, 5).map((url) => `<img src="${url}" alt="">`).join('');
  gallery.innerHTML = `<img src="${photos[0]}" alt="" class="main-photo"><div class="thumb-grid">${thumbs}</div>`;
  document.getElementById('all-photos').innerHTML = photos.map((url) => `<img src="${url}" alt="">`).join('');
  await Promise.all([...gallery.querySelectorAll('img')].map((img) => img.decode().catch(() => {})));
  return true;
}

async function loadPublicContent() {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) return;
    const data = await res.json();
    contentLoaded = true;
    if (data.calendar) siteCalendar = data.calendar;
    else if (Array.isArray(data.listings) && data.listings[0]?.price) {
      siteCalendar = { settings: { basePrice: data.listings[0].price, minNights: 1, maxNights: 365, advanceNotice: 0, windowMonths: 24 }, days: {} };
    }
    const listing = Array.isArray(data.listings) && data.listings[0];
    if (listing) {
      await applyPublishedListing(listing);
      window.__propertyName = listing.title;
      if (listing.price) window.__baseNightly = Number(listing.price);
    }
  } catch (err) {
    console.warn('Could not load published listing', err);
  } finally {
    document.querySelector('.gallery')?.classList.remove('is-pending');
  }
}

function nightPriceCents(dateStr) {
  const cal = hostCalendar();
  const base = (cal?.settings?.basePrice || NIGHTLY_RATE / 100) * 100;
  const custom = cal?.days?.[dateStr]?.price;
  return Math.round((custom || base / 100) * 100);
}

function localIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function stayTotalCents(checkin, checkout) {
  let total = 0;
  const d = new Date(checkin + 'T00:00:00');
  const end = new Date(checkout + 'T00:00:00');
  while (d < end) {
    total += nightPriceCents(localIso(d));
    d.setDate(d.getDate() + 1);
  }
  return total;
}

function updatePriceSummary() {
  const checkin = document.getElementById('checkin').value;
  const checkout = document.getElementById('checkout').value;
  const summary = document.getElementById('price-summary');
  const nights = calculateNights(checkin, checkout);
  if (nights <= 0) {
    summary.style.display = 'none';
    return;
  }
  const total = stayTotalCents(checkin, checkout) / 100;
  const avg = total / nights;
  summary.innerHTML = `<strong>${nights} night${nights > 1 ? 's' : ''}</strong> · avg $${avg.toFixed(0)} = <strong>$${total.toFixed(2)}</strong>`;
  summary.style.display = 'block';
}

async function initCalendars() {
  let blocked = await loadBlockedDates();
  const cal = hostCalendar();
  if (cal?.days) {
    const localBlocked = Object.entries(cal.days).filter(([, v]) => v.blocked).map(([d]) => d);
    blocked = [...new Set([...(blocked || []), ...localBlocked])];
  }
  const settings = cal?.settings || {};
  const min = new Date();
  min.setDate(min.getDate() + (settings.advanceNotice || 0));
  const max = new Date();
  max.setMonth(max.getMonth() + (settings.windowMonths || 24));

  const fpConfig = {
    minDate: min,
    maxDate: max,
    dateFormat: 'Y-m-d',
    disable: blocked,
    onChange: updatePriceSummary
  };

  flatpickr('#checkin', { ...fpConfig, onClose: function(selectedDates) {
    if (selectedDates[0]) {
      const checkoutFp = document.querySelector('#checkout')._flatpickr;
      if (checkoutFp) {
        const next = new Date(selectedDates[0]);
        const night = localIso(selectedDates[0]);
        const minN = cal?.days?.[night]?.minNights || settings.minNights || 1;
        next.setDate(next.getDate() + minN);
        checkoutFp.set('minDate', next);
      }
    }
    updatePriceSummary();
  }});

  flatpickr('#checkout', { ...fpConfig, onClose: updatePriceSummary });
}

document.getElementById('booking-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  if (!document.getElementById('agree-terms').checked) {
    alert('Please agree to the Short-Term Rental Agreement to continue.');
    return;
  }

  const checkin = document.getElementById('checkin').value;
  const checkout = document.getElementById('checkout').value;
  const guests = document.getElementById('guests').value;
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const message = document.getElementById('message').value;

  const nights = calculateNights(checkin, checkout);
  if (nights <= 0) {
    alert('Please select valid check-in and check-out dates.');
    return;
  }
  const cal = hostCalendar();
  const minN = cal?.days?.[checkin]?.minNights || cal?.settings?.minNights || 1;
  const maxN = cal?.settings?.maxNights || 365;
  if (nights < minN) {
    alert(`This arrival date requires a minimum stay of ${minN} nights.`);
    return;
  }
  if (nights > maxN) {
    alert(`Maximum stay is ${maxN} nights.`);
    return;
  }

  const totalCents = stayTotalCents(checkin, checkout);

  const btn = document.getElementById('book-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Redirecting to payment…';

  try {
    const response = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nights,
        amount: totalCents,
        checkin,
        checkout,
        guests,
        name,
        email,
        message,
        property: window.__propertyName || 'RiverStone Retreat'
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || 'Could not create checkout session');
    }

    const { sessionId } = await response.json();
    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) throw error;
  } catch (err) {
    console.error(err);
    alert('Payment setup failed: ' + err.message);
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

// Init after published content loads, so guests see the dashboard data.
loadPublicContent().finally(() => {
  initCalendars();
  initLightbox();
});

// ============ Lightbox Gallery ============
let galleryImages = [];
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const closeBtn = document.querySelector('.lightbox-close');
const prevBtn = document.querySelector('.lightbox-prev');
const nextBtn = document.querySelector('.lightbox-next');

let currentIndex = 0;

function openLightbox(index) {
  galleryImages = Array.from(document.querySelectorAll('#all-photos img'));
  if (!galleryImages.length) return;
  currentIndex = index;
  lightbox.style.display = 'flex';
  showImage();
}

function showImage() {
  const img = galleryImages[currentIndex];
  if (!img) return;
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt || '';
  lightboxCaption.textContent = img.alt || `Photo ${currentIndex + 1} of ${galleryImages.length}`;
}

function closeLightbox() {
  lightbox.style.display = 'none';
}

function nextImage() {
  if (!galleryImages.length) return;
  currentIndex = (currentIndex + 1) % galleryImages.length;
  showImage();
}

function prevImage() {
  if (!galleryImages.length) return;
  currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
  showImage();
}

function initLightbox() {
  lightbox.addEventListener('click', (e) => {
    if (e.target.closest('.lightbox-next')) {
      e.preventDefault();
      e.stopPropagation();
      nextImage();
      return;
    }
    if (e.target.closest('.lightbox-prev')) {
      e.preventDefault();
      e.stopPropagation();
      prevImage();
      return;
    }
    if (e.target.closest('.lightbox-close')) {
      closeLightbox();
      return;
    }
    if (e.target === lightbox) closeLightbox();
  });
  document.querySelector('.gallery').addEventListener('click', (e) => {
    const img = e.target.closest('img');
    galleryImages = Array.from(document.querySelectorAll('#all-photos img'));
    if (!img) { openLightbox(0); return; }
    const src = img.src.split('?')[0];
    const idx = galleryImages.findIndex(g => g.src.split('?')[0] === src);
    openLightbox(idx >= 0 ? idx : 0);
  });
  document.addEventListener('keydown', (e) => {
    if (lightbox.style.display === 'flex') {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    }
  });
}