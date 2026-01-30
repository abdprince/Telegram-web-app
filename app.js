const App = {
  init() {
    this.main = document.getElementById('main');
    this.backBtn = document.getElementById('backBtn');
    this.menuBtn = document.getElementById('menuBtn');

    this.views = {
      welcome: this.renderWelcome.bind(this),
      list: this.renderList.bind(this),
      detail: this.renderDetail.bind(this),
      form: this.renderForm.bind(this),
      profile: this.renderProfile.bind(this), // view جديدة للملف الشخصي
    };

    this.stack = []; // navigation stack
    this.items = [
      {id:1, title:'عنصر ١', desc:'وصف قصير للعنصر الأول'},
      {id:2, title:'عنصر ٢', desc:'وصف عنصر ثاني'}
    ];

    // === تعديل داخل init() — تعيين الملف الشخصي الافتراضي ثم تحميل ما في localStorage =================
this.profile = {
  name: 'اسم المستخدم',
  email: 'user@example.com',
  bio: 'نبذة صغيرة عن المستخدم',
  telegramId: '' // حقل جديد لمعرف تليغرام
};

// حاول تحميل الملف الشخصي من التخزين المحلي (إن وُجد)
this._loadProfile();

// ... بداخل البلوك الذي يتعامل مع Telegram WebApp (بعد this.WebApp.ready();)
if (window.Telegram && window.Telegram.WebApp) {
  this.WebApp = window.Telegram.WebApp;
  this.WebApp.ready();
  // hide telegram main button initially
  this.WebApp.MainButton.hide();

  // إذا كان Telegram قد زوّدنا بمعلومات المستخدم، خزن المعرف بشكل دائم
  const tgUser = (this.WebApp.initDataUnsafe && this.WebApp.initDataUnsafe.user) || null;
  if (tgUser && tgUser.id) {
    // لا نُعيد الكتابة إذا كان المعرف محفوظاً مسبقاً في localStorage
    if (!this.profile.telegramId) {
      this.profile.telegramId = String(tgUser.id);
      this._saveProfile();
    }
  }

  this.WebApp.onEvent('mainButtonClicked', ()=> {
    // handle main button presses globally (contextual)
    if (this.currentView === 'form') this.submitForm();
    else if (this.currentView === 'profile') this.saveProfile();
    else if (this.currentView === 'detail') alert('Main button action on detail');
  });
  // back button
  this.WebApp.BackButton.show();
  this.WebApp.onEvent('backButtonClicked', ()=> this.goBack());

    }

    // Inject minimal CSS for dropdown (only once)
    this._ensureMenuStyles();

    this.navigate('welcome');
  },

  // Inject styles for dropdown menu
  // (استبدال) Inject styles for dropdown menu
// (استبدال) Inject styles for dropdown menu
_ensureMenuStyles(){
  if (document.getElementById('appMenuStyles')) return;
  const css = `
    #appMenu {
      position: fixed; /* fixed so it doesn't affect page layout / width */
      min-width: 160px;
      background: #fff;
      border: 1px solid rgba(0,0,0,0.08);
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
      border-radius: 8px;
      overflow: hidden;
      z-index: 9999;
      transform-origin: top right;
      transition: opacity .15s ease, transform .15s ease;
      opacity: 0;
      pointer-events: none;
      direction: rtl;
    }
    #appMenu.show {
      opacity: 1;
      transform: translateY(6px) scale(1);
      pointer-events: auto;
    }
    #appMenu .menu-item {
      padding: 10px 12px;
      cursor: pointer;
      font-size: 14px;
      color: #111827;
    }
    #appMenu .menu-item:hover {
      background: #f3f4f6;
    }
    #appMenu .menu-divider {
      height: 1px;
      background: #e5e7eb;
      margin: 4px 0;
    }
    /* أساسيات لعرض صفحة الملف الشخصي */
    .profile-card .field { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
    .profile-card .field label { font-size:13px; color:#374151; }
    .profile-card .field input, .profile-card .field textarea { padding:8px 10px; border:1px solid #e5e7eb; border-radius:6px; font-size:14px; }
    .profile-actions { display:flex; gap:8px; margin-top:8px; }
  `;
  const s = document.createElement('style');
  s.id = 'appMenuStyles';
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
},

  // Create the dropdown element and global handlers (lazy)
  createMenu(){
    if (this.menu) return;
    const menu = document.createElement('div');
    menu.id = 'appMenu';
    menu.innerHTML = `
      <div class="menu-item" data-action="profile">الملف الشخصي</div>
      <div class="menu-item" data-action="about">حول</div>
      <div class="menu-item" data-action="share">مشاركة التطبيق</div>
      <div class="menu-divider"></div>
      <div class="menu-item" data-action="logout">تسجيل الخروج</div>
    `;
    // click handler for items
    menu.addEventListener('click', (e)=> {
      const action = e.target.dataset.action;
      if (action) {
        this.handleMenuAction(action);
      }
    });
    document.body.appendChild(menu);
    // close when clicking outside
    this._menuDocClick = (e)=> {
      if (!menu.contains(e.target) && e.target !== this.menuBtn) this.hideMenu();
    };
    document.addEventListener('click', this._menuDocClick);
    // close on escape
    this._menuKeyDown = (e)=> {
      if (e.key === 'Escape') this.hideMenu();
    };
    document.addEventListener('keydown', this._menuKeyDown);
    this.menu = menu;
  },

  // Toggle menu visibility and position it near the menuBtn
// (استبدال) Toggle menu visibility and smartly position it near the menuBtn
toggleMenu(){
  this.createMenu();
  const menu = this.menu;
  const btn = this.menuBtn;
  const rect = btn.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 8;

  // if already visible -> hide
  if (menu.classList.contains('show')) {
    this.hideMenu();
    return;
  }

  // temporarily add show + hidden visibility to measure width without flashing
  menu.style.visibility = 'hidden';
  menu.classList.add('show');
  const mw = menu.offsetWidth || 160; // fallback width
  menu.style.visibility = '';

  // try to align the menu's RIGHT edge with the button's RIGHT edge (so menu appears to the right)
  let left = rect.right + window.scrollX - mw;

  // keep it inside viewport with small margin
  const margin = 8;
  if (left < margin) {
    // if not enough space on left side, try aligning left edge to button's left
    left = rect.left + window.scrollX;
    // set transform origin accordingly
    menu.style.transformOrigin = 'top left';
  } else {
    menu.style.transformOrigin = 'top right';
  }

  if (left + mw > window.innerWidth - margin) {
    left = window.innerWidth - mw - margin;
  }

  menu.style.left = `${Math.max(left, margin)}px`;
  menu.style.top = `${top}px`;
  menu.style.right = 'auto';

  // finally show (class already added above)
  // note: pointer-events and opacity handled by .show class
},

  hideMenu(){
    if (!this.menu) return;
    this.menu.classList.remove('show');
  },

  // Handle menu item actions (extend as needed)
  handleMenuAction(action){
    this.hideMenu();
    if (action === 'about') {
      alert('تطبيق تجريبي لبناء واجهات متوافقة مع Telegram Mini Apps\nالإصدار 1.0');
    } else if (action === 'share') {
      if (navigator.share) {
        navigator.share({title: 'التطبيق التجريبي', text: 'جرب هذا التطبيق التجريبي', url: location.href}).catch(()=>{});
      } else {
        alert('مشاركة: ' + location.href);
      }
    } else if (action === 'logout') {
      alert('تم تسجيل الخروج (مثال)');
    } else if (action === 'profile') {
      // افتح صفحة الملف الشخصي
      this.navigate('profile');
    }
  },

  setMainButton(text, visible=true){
    if (this.WebApp){
      this.WebApp.MainButton.setText(text);
      if (visible) this.WebApp.MainButton.show(); else this.WebApp.MainButton.hide();
    } else {
      // local fallback: show local footer button
      const footer = document.getElementById('localFooter');
      footer.innerHTML = visible ? `<div class="center"><button id="localMainBtn" class="btn">${text}</button></div>` : '';
      const btn = document.getElementById('localMainBtn');
      if (btn) btn.addEventListener('click', ()=> {
        if (this.currentView === 'form') this.submitForm();
        else if (this.currentView === 'profile') this.saveProfile();
        else if (this.currentView === 'detail') alert('Local main button action');
      });
    }
  },

  navigate(view, params){
    // hide menu when navigating
    this.hideMenu();
    this.stack.push({view, params});
    this.currentView = view;
    this.renderCurrent();
    // back button visibility
    if (this.stack.length > 1) this.backBtn.classList.remove('hidden'); else this.backBtn.classList.add('hidden');
  },

  goBack(){
    // hide menu when going back
    this.hideMenu();
    if (this.stack.length > 1){
      this.stack.pop();
      const top = this.stack[this.stack.length-1];
      this.currentView = top.view;
      this.renderCurrent();
      if (this.WebApp) this.WebApp.MainButton.hide();
    }
  },

  renderCurrent(){
    this.main.innerHTML = '';
    const top = this.stack[this.stack.length-1];
    this.views[top.view](top.params);
  },

  renderWelcome(){
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="center" style="flex-direction:column;gap:16px;padding-top:24px">
        <div style="width:92px;height:92px;border-radius:18px;background:linear-gradient(90deg,#0088cc,#0077b6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px">ت</div>
        <h2 style="margin:0">أهلاً بك في التطبيق</h2>
        <p class="small" style="max-width:320px;text-align:center;color:#6b7280">تطبيق تجريبي لبناء واجهات متوافقة مع Telegram Mini Apps</p>
        <div style="height:8px"></div>
        <button id="startBtn" class="btn">ابدأ</button>
      </div>
    `;
    this.main.appendChild(el);
    document.getElementById('startBtn').addEventListener('click', ()=> {
      this.navigate('list');
    });
    this.setMainButton('', false);
  },

  renderList(){
    const container = document.createElement('div');
    this.items.forEach(it=>{
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="detail-image">${it.title.charAt(0)}</div>
        <div class="meta">
          <p class="h">${it.title}</p>
          <p class="s">${it.desc}</p>
        </div>
        <div><button class="btn" data-id="${it.id}">عرض</button></div>
      `;
      container.appendChild(card);
    });
    // add create new card
    const addCard = document.createElement('div');
    addCard.className = 'card';
    addCard.innerHTML = `<div style="flex:1"><p class="h">إضافة جديد</p><p class="small">إنشاء عنصر جديد بسرعة</p></div><div><button class="btn" id="addNew">+</button></div>`;
    container.appendChild(addCard);

    this.main.appendChild(container);
    container.querySelectorAll('.card .btn[data-id]').forEach(b=>{
      b.addEventListener('click', (e)=>{
        const id = Number(e.target.dataset.id);
        const it = this.items.find(x=>x.id===id);
        this.navigate('detail', {item: it});
      });
    });
    document.getElementById('addNew').addEventListener('click', ()=> this.navigate('form'));

    this.setMainButton('', false);
  },

  renderDetail({item}){
    const box = document.createElement('div');
    box.innerHTML = `
      <div class="card" style="flex-direction:column;align-items:stretch">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="detail-image">${item.title.charAt(0)}</div>
          <div class="meta"><p class="h">${item.title}</p><p class="s">${item.desc}</p></div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button id="editBtn" class="btn" style="background:#00a3ff">تحرير</button>
          <button id="shareBtn" class="btn" style="background:#34c759">مشاركة</button>
        </div>
      </div>
    `;
    this.main.appendChild(box);
    document.getElementById('editBtn').addEventListener('click', ()=> {
      this.navigate('form', {item});
    });
    document.getElementById('shareBtn').addEventListener('click', ()=> {
      alert('تم مشاركة العنصر (مثال)');
    });

    // show main button contextually
    this.setMainButton('إجراء رئيسي', true);
  },

  renderForm({item}){
    const box = document.createElement('div');
    box.innerHTML = `
      <div class="card" style="flex-direction:column">
        <input id="title" class="input" placeholder="العنوان" value="${item?item.title:''}" />
        <textarea id="desc" class="input" placeholder="الوصف" rows="4">${item?item.desc:''}</textarea>
      </div>
    `;
    this.main.appendChild(box);
    this.setMainButton(item ? 'حفظ التغييرات' : 'إنشاء', true);
    // local fallback: no extra handlers here because mainButton triggers submitForm()
  },

  // view الملف الشخصي: عرض وتحرير
  renderProfile(){
    const box = document.createElement('div');
    box.className = 'profile-card';
    box.innerHTML = `
      <div class="card" style="flex-direction:column">
        <div class="field">
          <label for="profileName">الاسم</label>
          <input id="profileName" value="${this._escapeHtml(this.profile.name)}" />
        </div>
        <div class="field">
          <label for="profileEmail">البريد الإلكتروني</label>
          <input id="profileEmail" value="${this._escapeHtml(this.profile.email)}" />
        </div>
        <div class="field">
          <label for="profileBio">نبذة</label>
          <textarea id="profileBio" rows="4">${this._escapeHtml(this.profile.bio)}</textarea>
        </div>
        <div class="profile-actions">
          <button id="saveProfileBtn" class="btn" style="background:#00a3ff">حفظ</button>
          <button id="cancelProfileBtn" class="btn">إلغاء</button>
        </div>
      </div>
    `;
    this.main.appendChild(box);

    document.getElementById('saveProfileBtn').addEventListener('click', ()=> this.saveProfile());
    document.getElementById('cancelProfileBtn').addEventListener('click', ()=> this.goBack());

    // MainButton should also be a way to save
    this.setMainButton('حفظ', true);
  },

  // حفظ بيانات الملف الشخصي
  saveProfile(){
    const name = document.getElementById('profileName')?.value?.trim() || this.profile.name;
    const email = document.getElementById('profileEmail')?.value?.trim() || this.profile.email;
    const bio = document.getElementById('profileBio')?.value?.trim() || this.profile.bio;

    // هنا يمكنك إضافة تحقق/إرسال إلى API عند الحاجة
    this.profile = { name, email, bio };
    alert('تم حفظ بيانات الملف الشخصي');
    this.goBack();
  },

  submitForm(){
    const title = document.getElementById('title')?.value || `عنصر ${this.items.length+1}`;
    const desc = document.getElementById('desc')?.value || 'وصف';
    // naive add
    this.items.push({id: this.items.length+1, title, desc});
    alert('تم الحفظ');
    this.goBack(); // return to list (or you can navigate('list'))
    // ensure list is refreshed
    // replace top with list
    this.stack = [{view:'list'}];
    this.renderCurrent();
  },

  // مساعدة بسيطة لتفادي حقن HTML في الحقول
  _escapeHtml(str){
    return String(str || '').replace(/[&<>"']/g, s=> {
      const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
      return map[s] || s;
    });
  }
};

document.addEventListener('DOMContentLoaded', ()=> App.init());
