// بسيط: تحكّم في التنقل بين "شاشات" داخل نفس الصفحة
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
    };

    this.stack = []; // navigation stack
    this.items = [
      {id:1, title:'عنصر ١', desc:'وصف قصير للعنصر الأول'},
      {id:2, title:'عنصر ٢', desc:'وصف عنصر ثاني'}
    ];

    this.backBtn.addEventListener('click', ()=> this.goBack());
    this.menuBtn.addEventListener('click', ()=> alert('قائمة'));

    // Telegram WebApp integration (guarded)
    if (window.Telegram && window.Telegram.WebApp) {
      this.WebApp = window.Telegram.WebApp;
      this.WebApp.ready();
      // hide telegram main button initially
      this.WebApp.MainButton.hide();
      this.WebApp.onEvent('mainButtonClicked', ()=> {
        // handle main button presses globally (contextual)
        if (this.currentView === 'form') this.submitForm();
        else if (this.currentView === 'detail') alert('Main button action on detail');
      });
      // back button
      this.WebApp.BackButton.show();
      this.WebApp.onEvent('backButtonClicked', ()=> this.goBack());
    }

    this.navigate('welcome');
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
        else if (this.currentView === 'detail') alert('Local main button action');
      });
    }
  },

  navigate(view, params){
    this.stack.push({view, params});
    this.currentView = view;
    this.renderCurrent();
    // back button visibility
    if (this.stack.length > 1) this.backBtn.classList.remove('hidden'); else this.backBtn.classList.add('hidden');
  },

  goBack(){
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
  }
};

document.addEventListener('DOMContentLoaded', ()=> App.init());