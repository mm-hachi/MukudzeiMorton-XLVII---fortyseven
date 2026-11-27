const sizes = [
  { id: "single", label: "S", price: 2299 },
  { id: "three-quarter", label: "3/4", price: 2499 },
  { id: "double", label: "D", price: 2999 },
  { id: "queen", label: "Q", price: 3199 },
  { id: "king", label: "K", price: 3449 }
];

const colours = [
  { id: "emerald-green", label: "Emerald Green", file: "EmeraldGreen.webp" },
  { id: "ruby-red", label: "Ruby Red", file: "RubyRed.webp" },
  { id: "sapphire-blue", label: "Sapphire Blue", file: "SapphireBlue.webp" },
  { id: "baby-blue", label: "Baby Blue", file: "BabyBlue.webp" },
  { id: "baby-pink", label: "Baby Pink", file: "BabyPink.webp" },
  { id: "candy-pink", label: "Candy Pink", file: "CandyPink.webp" },
  { id: "deep-purple", label: "Deep purple", file: "DeepPurple.webp" },
  { id: "dusky-pink", label: "Dusky Pink", file: "DuskyPink.webp" },
  { id: "light-grey", label: "Light Grey", file: "LightGrey.webp" },
  { id: "dark-grey", label: "Dark Grey", file: "DarkGrey.webp" },
  { id: "black", label: "Black", file: "Black.webp" }
];

let selectedSize = null;
let selectedColour = null;
let quantity = 1;
let cartCount = 0;
let thumbnailOffset = 0;

const sizeOptions = document.querySelector("#size-options");
const colourSelect = document.querySelector("#colour-select");
const thumbnails = document.querySelector("#thumbnails");
const thumbnailViewport = document.querySelector("#thumbnail-viewport");
const previousThumbnailButton = document.querySelector("#thumbnail-previous");
const nextThumbnailButton = document.querySelector("#thumbnail-next");
const mainImage = document.querySelector("#main-image");
const quantityOutput = document.querySelector("#quantity");
const summary = document.querySelector("#selected-summary");
const variantPrice = document.querySelector("#variant-price");
const priceOutput = document.querySelector("#price");
const cartButton = document.querySelector("#add-to-cart");
const configurationHint = document.querySelector("#configuration-hint");
const toast = document.querySelector("#toast");

const formatPrice = (value) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" })
    .format(value)
    .replace(/\s/g, "")
    .replace("R", "R");

sizes.forEach((size) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = size.label;
  button.dataset.size = size.id;
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => selectSize(size, button));
  sizeOptions.appendChild(button);
});

const placeholder = document.createElement("option");
placeholder.value = "";
placeholder.textContent = "Choose an option";
placeholder.selected = true;
placeholder.disabled = true;
colourSelect.appendChild(placeholder);

colours.forEach((colour) => {
  const option = document.createElement("option");
  option.value = colour.id;
  option.textContent = colour.label;
  colourSelect.appendChild(option);

  const thumbnail = document.createElement("button");
  thumbnail.type = "button";
  thumbnail.className = "thumbnail";
  thumbnail.dataset.colour = colour.id;
  thumbnail.setAttribute("aria-label", `View ${colour.label}`);
  thumbnail.setAttribute("aria-pressed", "false");
  thumbnail.innerHTML = `<img src="assets/${colour.file}" alt="">`;
  thumbnail.addEventListener("click", () => selectColour(colour));
  thumbnails.appendChild(thumbnail);
});

function selectSize(size, button) {
  selectedSize = size;
  document.querySelectorAll(".size-options button").forEach((item) => {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  updateVariant();
}

function selectColour(colour) {
  selectedColour = colour;
  mainImage.src = `assets/${colour.file}`;
  mainImage.alt = `Jasmine Headboard in ${colour.label}`;
  colourSelect.value = colour.id;
  document.querySelectorAll(".thumbnail").forEach((item) => {
    const active = item.dataset.colour === colour.id;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  const selectedIndex = colours.findIndex((item) => item.id === colour.id);
  if (selectedIndex < thumbnailOffset) thumbnailOffset = selectedIndex;
  if (selectedIndex >= thumbnailOffset + 4) thumbnailOffset = selectedIndex - 3;
  updateThumbnailPosition();
  updateVariant();
}

function updateVariant() {
  const configured = Boolean(selectedSize && selectedColour);
  variantPrice.hidden = !configured;
  configurationHint.hidden = configured;
  cartButton.disabled = !configured;
  if (!configured) {
    summary.textContent = "";
    return;
  }
  const price = formatPrice(selectedSize.price);
  priceOutput.textContent = price;
  summary.textContent = `${selectedSize.label} / ${selectedColour.label} — ${price}`;
}

colourSelect.addEventListener("change", (event) => {
  const colour = colours.find((item) => item.id === event.target.value);
  if (colour) selectColour(colour);
});

document.querySelector("#decrease").addEventListener("click", () => {
  quantity = Math.max(1, quantity - 1);
  quantityOutput.value = quantity;
  quantityOutput.textContent = quantity;
});

document.querySelector("#increase").addEventListener("click", () => {
  quantity += 1;
  quantityOutput.value = quantity;
  quantityOutput.textContent = quantity;
});

document.querySelector("#wishlist").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const active = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(active));
  button.querySelector("span").textContent = active ? "Added to wishlist" : "Add to wishlist";
  showToast(active ? "Added to wishlist" : "Removed from wishlist");
});

document.querySelector("#configurator").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedSize || !selectedColour) {
    showToast("Choose a size and colour first");
    return;
  }
  cartCount += quantity;
  showToast(`${quantity} × Jasmine Headboard added to cart`);
  const cartLabel = cartButton.querySelector("span");
  cartLabel.textContent = `Added · ${cartCount}`;
  window.setTimeout(() => { cartLabel.textContent = "Add to cart"; }, 1800);
});

document.querySelector(".gallery-prev").addEventListener("click", () => stepColour(-1));
document.querySelector(".gallery-next").addEventListener("click", () => stepColour(1));

function stepColour(direction) {
  const index = colours.findIndex((item) => item.id === selectedColour.id);
  const nextIndex = (index + direction + colours.length) % colours.length;
  selectColour(colours[nextIndex]);
}

function updateThumbnailSizes() {
  const visibleCount = 4;
  const gap = Number.parseFloat(getComputedStyle(thumbnails).gap) || 0;
  const itemWidth = (thumbnailViewport.clientWidth - gap * (visibleCount - 1)) / visibleCount;
  thumbnails.querySelectorAll(".thumbnail").forEach((thumbnail) => {
    thumbnail.style.flex = `0 0 ${itemWidth}px`;
  });
}

function updateThumbnailPosition() {
  const thumbnail = thumbnails.querySelector(".thumbnail");
  if (!thumbnail) return;
  const gap = Number.parseFloat(getComputedStyle(thumbnails).gap) || 0;
  const itemWidth = thumbnail.getBoundingClientRect().width;
  const maxOffset = Math.max(0, colours.length - 4);
  thumbnailOffset = Math.min(thumbnailOffset, maxOffset);
  thumbnails.style.transform = `translateX(-${thumbnailOffset * (itemWidth + gap)}px)`;
  previousThumbnailButton.disabled = thumbnailOffset === 0;
  nextThumbnailButton.disabled = thumbnailOffset === maxOffset;
}

previousThumbnailButton.addEventListener("click", () => {
  thumbnailOffset = Math.max(0, thumbnailOffset - 1);
  updateThumbnailPosition();
});
nextThumbnailButton.addEventListener("click", () => {
  thumbnailOffset = Math.min(colours.length - 4, thumbnailOffset + 1);
  updateThumbnailPosition();
});
window.addEventListener("resize", () => {
  updateThumbnailSizes();
  updateThumbnailPosition();
});

const searchButton = document.querySelector(".search-button");
const searchPanel = document.querySelector(".search-panel");
searchButton.addEventListener("click", () => {
  const open = searchPanel.classList.toggle("open");
  searchPanel.setAttribute("aria-hidden", String(!open));
  if (open) document.querySelector("#site-search").focus();
});
document.querySelector(".search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  showToast("Search is ready");
});

const navToggle = document.querySelector(".nav-toggle");
const mainNav = document.querySelector(".main-nav");
navToggle.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

updateThumbnailSizes();
updateThumbnailPosition();
