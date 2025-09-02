import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { collection, addDoc, getDocs, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { ref as sref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// --------- Public: load products and render ---------
const productsDiv = document.getElementById('products');
async function renderProducts(){
  productsDiv.innerHTML = '<p>Loading products...</p>';
  try{
    const q = collection(db, 'products');
    // realtime listener optional, here using getDocs for simplicity
    const snap = await getDocs(q);
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    if(items.length === 0){ productsDiv.innerHTML = '<p>No products yet.</p>'; return; }
    productsDiv.innerHTML = '';
    items.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';
      const img = document.createElement('img');
      img.src = p.imageURL || 'images/placeholder.png';
      img.alt = p.title || 'product';
      const h3 = document.createElement('h3'); h3.textContent = p.title || 'Untitled';
      const desc = document.createElement('p'); desc.textContent = p.description || '';
      const price = document.createElement('p'); price.textContent = p.price ? '₹' + p.price : '';
      const btn = document.createElement('button'); btn.textContent = 'Add to Cart';
      card.appendChild(img); card.appendChild(h3); card.appendChild(desc); card.appendChild(price); card.appendChild(btn);
      productsDiv.appendChild(card);
    });
  }catch(e){
    productsDiv.innerHTML = '<p>Error loading products.</p>';
    console.error(e);
  }
}

// --------- Admin: auth flow and product management ---------
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const signupBtn = document.getElementById('signup');
const loginBtn = document.getElementById('login');
const logoutBtn = document.getElementById('logout');
const authForm = document.getElementById('auth-form');
const adminPanel = document.getElementById('admin-panel');
const productForm = document.getElementById('product-form');
const adminProductsDiv = document.getElementById('admin-products');

signupBtn?.addEventListener('click', async ()=>{
  const email = emailInput.value; const pass = passInput.value;
  try{ await createUserWithEmailAndPassword(auth, email, pass); alert('Signup success'); }
  catch(e){ alert('Signup error: ' + e.message); }
});

loginBtn?.addEventListener('click', async ()=>{
  const email = emailInput.value; const pass = passInput.value;
  try{ await signInWithEmailAndPassword(auth, email, pass); }
  catch(e){ alert('Login error: ' + e.message); }
});

logoutBtn?.addEventListener('click', async ()=>{ await signOut(auth); });

onAuthStateChanged(auth, user => {
  if(user){
    adminPanel.style.display = 'block';
    logoutBtn.style.display = 'inline-block';
    signupBtn.style.display = 'none';
    loginBtn.style.display = 'none';
    loadAdminProducts();
  } else {
    adminPanel.style.display = 'none';
    logoutBtn.style.display = 'none';
    signupBtn.style.display = 'inline-block';
    loginBtn.style.display = 'inline-block';
    adminProductsDiv.innerHTML = '';
  }
});

productForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const title = document.getElementById('title').value;
  const price = document.getElementById('price').value;
  const description = document.getElementById('description').value;
  const file = document.getElementById('image-file').files[0];

  try{
    let imageURL = '';
    if(file){
      const storageRef = sref(storage, 'product-images/' + Date.now() + '_' + file.name);
      await uploadBytes(storageRef, file);
      imageURL = await getDownloadURL(storageRef);
    }
    await addDoc(collection(db, 'products'), { title, price, description, imageURL, createdAt: new Date() });
    productForm.reset();
    alert('Product added');
    loadAdminProducts();
    renderProducts();
  }catch(e){ console.error(e); alert('Error adding product: ' + e.message); }
});

// load products in admin panel with delete option
async function loadAdminProducts(){
  adminProductsDiv.innerHTML = '<p>Loading...</p>';
  try{
    const q = collection(db, 'products');
    const snap = await getDocs(q);
    adminProductsDiv.innerHTML = '';
    snap.forEach(d => {
      const data = d.data();
      const el = document.createElement('div');
      el.className = 'admin-card';
      const img = document.createElement('img');
      img.src = data.imageURL || 'images/placeholder.png';
      const info = document.createElement('div');
      info.innerHTML = `<strong>${data.title}</strong><div>₹${data.price}</div><div>${data.description || ''}</div>`;
      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.addEventListener('click', async ()=>{
        if(!confirm('Delete this product?')) return;
        try{ await deleteDoc(doc(db, 'products', d.id)); el.remove(); renderProducts(); }
        catch(e){ alert('Delete error: ' + e.message); }
      });
      el.appendChild(img); el.appendChild(info); el.appendChild(del);
      adminProductsDiv.appendChild(el);
    });
  }catch(e){ adminProductsDiv.innerHTML = '<p>Error loading.</p>'; console.error(e); }
}

// initial load
renderProducts();
