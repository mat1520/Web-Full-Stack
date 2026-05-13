"use strict";

(() => {
  const API = "/api/v1";

  const $ = id => document.getElementById(id);
  const dom = {
    homeView: $("home-view"), detailView: $("detail-view"), videoGrid: $("video-grid"),
    categoryList: $("category-list"), backBtn: $("back-btn"), brandLink: $("brand-link"),
    mainVideo: $("main-video"), playerTitle: $("player-title"), playerMeta: $("player-meta"),
    playerDesc: $("player-description"), btnDeleteVideo: $("btn-delete-video"),
    commentForm: $("comment-form"), commentContent: $("comment-content"), commentsList: $("comments-list"),
    commentsCount: $("comments-count"), commentAuthPrompt: $("comment-auth-prompt"),
    btnPromptLogin: $("btn-prompt-login"), sidebarList: $("sidebar-list"), toast: $("toast"),
    authSection: $("auth-section"), userSection: $("user-section"), headerUsername: $("header-username"),
    btnLogin: $("btn-login"), btnRegister: $("btn-register"), btnLogout: $("btn-logout"),
    btnUploadOpen: $("btn-upload-open"), modalAuth: $("modal-auth"), modalTitle: $("modal-title"),
    modalClose: $("modal-close"), authForm: $("auth-form"), authUsername: $("auth-username"),
    authEmail: $("auth-email"), authPassword: $("auth-password"), authError: $("auth-error"),
    authSubmit: $("auth-submit"), fieldEmail: $("field-email"), modalSwitch: $("modal-switch"),
    modalUpload: $("modal-upload"), uploadClose: $("upload-close"), uploadForm: $("upload-form"),
    uploadTitle: $("upload-title"), uploadDesc: $("upload-desc"), uploadCategory: $("upload-category"),
    uploadVideo: $("upload-video"), uploadThumb: $("upload-thumb"), fileNameVideo: $("file-name-video"),
    fileNameThumb: $("file-name-thumb"), dropZone: $("drop-zone"), uploadProgress: $("upload-progress"),
    uploadBar: $("upload-bar"), uploadText: $("upload-text"), uploadError: $("upload-error"),
    uploadSubmit: $("upload-submit"), modalConfirm: $("modal-confirm"), confirmCancel: $("confirm-cancel"),
    confirmOk: $("confirm-ok")
  };

  const state = {
    videos: [], currentVideo: null, activeCategory: null, recommendations: {},
    token: localStorage.getItem("sc_token") || null,
    user: JSON.parse(localStorage.getItem("sc_user") || "null"),
    authMode: "login"
  };

  const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); };
  const clone = id => $(id).content.cloneNode(true);
  const timeAgo = d => {
    const mins = Math.floor((Date.now() - new Date(d)) / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d`;
    return `${Math.floor(days / 30)} mes(es)`;
  };

  let toastTimer;
  const showToast = (msg, type) => {
    dom.toast.textContent = msg;
    dom.toast.className = `toast toast--visible ${type === "success" ? "toast--success" : ""}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.className = "toast", 3500);
  };

  const request = async (endpoint, options = {}) => {
    const headers = options.headers || {};
    if (state.token && !options.noAuth) headers["Authorization"] = `Bearer ${state.token}`;
    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(`${API}${endpoint}`, { ...options, headers });
    if (!res.ok) {
      let err = "Error de conexión";
      try { err = (await res.json()).detail || `Error ${res.status}`; } catch(e){}
      throw new Error(err);
    }
    return res.status === 204 ? true : res.json();
  };

  const api = {
    getVideos: cat => request(`/videos${cat ? `?category=${encodeURIComponent(cat)}` : ""}`),
    getVideo: id => request(`/videos/${id}`),
    getRandomPicks: () => request("/videos/random-picks"),
    deleteVideo: id => request(`/videos/${id}`, { method: "DELETE" }),
    postComment: data => request("/comments", { method: "POST", body: data }),
    authRequest: (ep, data) => request(`/auth/${ep}`, { method: "POST", body: data, noAuth: true }),
    uploadVideo: (formData, onProgress) => new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API}/videos/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${state.token}`);
      xhr.upload.onprogress = e => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => xhr.status === 201 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(JSON.parse(xhr.responseText)?.detail || "Upload error"));
      xhr.onerror = () => reject(new Error("Error de red"));
      xhr.send(formData);
    })
  };

  const saveSession = data => {
    state.token = data.access_token;
    state.user = data.user;
    localStorage.setItem("sc_token", data.access_token);
    localStorage.setItem("sc_user", JSON.stringify(data.user));
    updateAuthUI();
  };
  const clearSession = () => {
    state.token = state.user = null;
    localStorage.removeItem("sc_token");
    localStorage.removeItem("sc_user");
    updateAuthUI();
  };

  const updateOwnershipUI = () => {
    dom.btnDeleteVideo.classList.toggle("view--hidden", !(state.currentVideo && state.user && state.currentVideo.owner_id === state.user.id));
  };

  const updateAuthUI = () => {
    const isAuth = !!state.user;
    dom.authSection.classList.toggle("view--hidden", isAuth);
    dom.userSection.classList.toggle("view--hidden", !isAuth);
    dom.commentAuthPrompt.classList.toggle("view--hidden", isAuth);
    dom.commentForm.classList.toggle("view--hidden", !isAuth);
    if (isAuth) dom.headerUsername.textContent = state.user.username;
    updateOwnershipUI();
  };

  const openAuthModal = mode => {
    state.authMode = mode;
    dom.authForm.reset();
    dom.authError.classList.add("view--hidden");
    const isReg = mode === "register";
    dom.modalTitle.textContent = isReg ? "Crear Cuenta" : "Iniciar Sesión";
    dom.fieldEmail.classList.toggle("view--hidden", !isReg);
    dom.authSubmit.textContent = isReg ? "Registrarse" : "Entrar";
    clear(dom.modalSwitch);
    dom.modalSwitch.appendChild(document.createTextNode(isReg ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "));
    const link = document.createElement("button");
    link.className = "modal__switch-link";
    link.type = "button";
    link.textContent = isReg ? "Inicia Sesión" : "Regístrate";
    link.onclick = () => openAuthModal(isReg ? "login" : "register");
    dom.modalSwitch.appendChild(link);
    dom.modalAuth.showModal();
  };

  const handleAuthSubmit = async e => {
    e.preventDefault();
    dom.authError.classList.add("view--hidden");
    dom.authSubmit.disabled = true;
    const data = { username: dom.authUsername.value.trim(), password: dom.authPassword.value };
    if (state.authMode === "register") data.email = dom.authEmail.value.trim();
    
    try {
      const res = await api.authRequest(state.authMode, data);
      saveSession(res);
      dom.modalAuth.close();
      showToast(`Bienvenido, ${res.user.username}`, "success");
    } catch (err) {
      dom.authError.textContent = err.message;
      dom.authError.classList.remove("view--hidden");
    } finally { dom.authSubmit.disabled = false; }
  };

  const handleUploadSubmit = async e => {
    e.preventDefault();
    dom.uploadError.classList.add("view--hidden");
    dom.uploadSubmit.disabled = true;
    dom.uploadProgress.classList.remove("view--hidden");

    const fd = new FormData();
    fd.append("title", dom.uploadTitle.value.trim());
    fd.append("description", dom.uploadDesc.value.trim());
    fd.append("category", dom.uploadCategory.value.trim());
    fd.append("video_file", dom.uploadVideo.files[0]);
    fd.append("thumbnail_file", dom.uploadThumb.files[0]);

    try {
      const video = await api.uploadVideo(fd, pct => {
        dom.uploadBar.style.width = `${pct}%`;
        dom.uploadText.textContent = `${pct}%`;
      });
      dom.modalUpload.close();
      state.videos = []; state.recommendations = {};
      showToast("Video subido correctamente", "success");
      navigateTo(`/video/${video.id}`);
    } catch (err) {
      dom.uploadError.textContent = err.message;
      dom.uploadError.classList.remove("view--hidden");
    } finally { dom.uploadSubmit.disabled = false; }
  };

  const executeDelete = async () => {
    dom.confirmOk.disabled = true;
    try {
      await api.deleteVideo(state.currentVideo.id);
      dom.modalConfirm.close();
      showToast("Video eliminado", "success");
      state.videos = []; state.recommendations = {};
      navigateTo("/");
    } catch (err) { showToast(err.message, "error"); }
    finally { dom.confirmOk.disabled = false; }
  };

  const handleCommentSubmit = async e => {
    e.preventDefault();
    if (!state.user) return showToast("Inicia sesión primero", "error");
    const content = dom.commentContent.value.trim();
    if (!content) return dom.commentContent.focus();

    dom.commentForm.querySelector(".comment-form__submit").disabled = true;
    const optimistic = { id: Date.now(), video_id: state.currentVideo.id, author: state.user.username, content, created_at: new Date().toISOString() };
    
    if (dom.commentsList.querySelector(".state-msg")) clear(dom.commentsList);
    dom.commentsList.prepend(renderComment(optimistic, true));
    dom.commentsCount.textContent = `(${state.currentVideo.comments.length + 1})`;
    dom.commentContent.value = "";

    try {
      const saved = await api.postComment({ video_id: state.currentVideo.id, content });
      state.currentVideo.comments.push(saved);
      dom.commentsList.querySelector(".comment--optimistic")?.classList.remove("comment--optimistic");
      showToast("Comentario publicado", "success");
    } catch (err) {
      dom.commentsList.querySelector(".comment--optimistic")?.remove();
      dom.commentsCount.textContent = `(${state.currentVideo.comments.length})`;
      dom.commentContent.value = content;
      showToast(err.message || "Error al enviar", "error");
    } finally { dom.commentForm.querySelector(".comment-form__submit").disabled = false; }
  };

  const renderState = (container, msg, retryFn) => {
    clear(container);
    const section = document.createElement("section");
    section.className = "state-msg";
    section.innerHTML = `<span class="state-msg__icon"></span><p class="state-msg__text">${msg}</p>`;
    if (retryFn) {
      const btn = document.createElement("button");
      btn.className = "state-msg__retry";
      btn.textContent = "Reintentar";
      btn.onclick = retryFn;
      section.appendChild(btn);
    }
    container.appendChild(section);
  };

  const renderComment = (comment, isOpt) => {
    const f = clone("tmpl-comment");
    if (isOpt) f.querySelector(".comment").classList.add("comment--optimistic");
    const author = comment.author || "Desconocido";
    f.querySelector(".comment__avatar").textContent = author[0].toUpperCase();
    f.querySelector(".comment__author").textContent = author;
    f.querySelector(".comment__date").textContent = timeAgo(comment.created_at);
    f.querySelector(".comment__content").textContent = comment.content;
    return f;
  };

  const renderVideoCard = v => {
    const f = clone("tmpl-video-card");
    f.querySelector(".video-card").dataset.videoId = v.id;
    const img = f.querySelector(".video-card__thumbnail");
    img.src = v.thumbnail_url; img.alt = v.title;
    f.querySelector(".video-card__duration").textContent = v.duration;
    f.querySelector(".video-card__title").textContent = v.title;
    f.querySelector(".video-card__category").textContent = v.category;
    f.querySelector(".video-card").onclick = () => navigateTo(`/video/${v.id}`);
    return f;
  };

  const renderSidebarCard = v => {
    const f = clone("tmpl-sidebar-card");
    f.querySelector(".sidebar-card").dataset.videoId = v.id;
    const img = f.querySelector(".sidebar-card__thumbnail");
    img.src = v.thumbnail_url; img.alt = v.title;
    f.querySelector(".sidebar-card__duration").textContent = v.duration;
    f.querySelector(".sidebar-card__title").textContent = v.title;
    f.querySelector(".sidebar-card__meta").textContent = v.category;
    f.querySelector(".sidebar-card").onclick = () => navigateTo(`/video/${v.id}`);
    return f;
  };

  const renderCategoryFilter = videos => {
    const cats = new Set(videos.map(v => v.category));
    clear(dom.categoryList);
    const createBtn = (label, val) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "category-filter__btn";
      btn.textContent = label;
      btn.dataset.category = val || "";
      btn.onclick = () => filterByCategory(val);
      li.appendChild(btn);
      return li;
    };
    dom.categoryList.appendChild(createBtn("Todos", null));
    cats.forEach(c => dom.categoryList.appendChild(createBtn(c, c)));
    updateActiveCategory(null);
  };

  const updateActiveCategory = cat => {
    state.activeCategory = cat;
    dom.categoryList.querySelectorAll(".category-filter__btn").forEach(btn => {
      const match = (btn.dataset.category || null) === (cat || null) || (!cat && btn.dataset.category === "");
      btn.classList.toggle("category-filter__btn--active", match);
    });
  };

  const filterByCategory = cat => {
    updateActiveCategory(cat);
    const filtered = cat ? state.videos.filter(v => v.category === cat) : state.videos;
    clear(dom.videoGrid);
    if (!filtered.length) return renderState(dom.videoGrid, "No hay videos en esta categoría");
    const frag = document.createDocumentFragment();
    filtered.forEach(v => frag.appendChild(renderVideoCard(v)));
    dom.videoGrid.appendChild(frag);
  };

  const showHomeView = async () => {
    dom.detailView.classList.add("view--hidden");
    dom.homeView.classList.remove("view--hidden");
    dom.backBtn.classList.remove("header__back--visible");
    dom.mainVideo.pause(); dom.mainVideo.removeAttribute("src"); dom.mainVideo.load();
    state.currentVideo = null; updateOwnershipUI();

    if (state.videos.length > 0) return filterByCategory(state.activeCategory);

    clear(dom.videoGrid);
    for(let i=0; i<8; i++) dom.videoGrid.appendChild(clone("tmpl-skeleton"));

    try {
      state.videos = await api.getVideos();
      renderCategoryFilter(state.videos);
      filterByCategory(state.activeCategory);
    } catch {
      renderState(dom.videoGrid, "Error al cargar los videos", showHomeView);
      showToast("Error de conexión", "error");
    }
  };

  const showDetailView = async id => {
    dom.homeView.classList.add("view--hidden");
    dom.detailView.classList.remove("view--hidden");
    dom.backBtn.classList.add("header__back--visible");

    dom.playerTitle.textContent = "Cargando...";
    clear(dom.playerMeta); dom.playerDesc.textContent = "";
    clear(dom.commentsList); dom.commentsCount.textContent = "";

    try {
      const v = await api.getVideo(id);
      state.currentVideo = v; updateOwnershipUI();
      dom.mainVideo.src = v.video_url; dom.mainVideo.poster = v.thumbnail_url;
      dom.mainVideo.muted = true;
      dom.mainVideo.play().then(() => dom.mainVideo.muted = false).catch(()=>{});
      dom.playerTitle.textContent = v.title; dom.playerDesc.textContent = v.description;
      
      dom.playerMeta.innerHTML = `<span class="player__category-badge">${v.category}</span><time>${v.duration}</time>`;
      
      dom.commentsCount.textContent = `(${v.comments.length})`;
      if (!v.comments.length) renderState(dom.commentsList, "Sé el primero en comentar");
      else {
        const frag = document.createDocumentFragment();
        v.comments.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).forEach(c => frag.appendChild(renderComment(c)));
        dom.commentsList.appendChild(frag);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      dom.playerTitle.textContent = "Video no encontrado";
      showToast("No se pudo cargar el video", "error");
    }

    try {
      if (!Object.keys(state.recommendations).length) state.recommendations = await api.getRandomPicks();
      const all = Object.values(state.recommendations).flat().filter(v => v.id !== id);
      const picks = all.sort(() => 0.5 - Math.random()).slice(0, 12);
      clear(dom.sidebarList);
      const frag = document.createDocumentFragment();
      picks.forEach(v => frag.appendChild(renderSidebarCard(v)));
      dom.sidebarList.appendChild(frag);
    } catch {
      dom.sidebarList.innerHTML = `<p class="state-msg__text">No se pudieron cargar las recomendaciones</p>`;
    }
  };

  const initDragAndDrop = () => {
    const pd = e => { e.preventDefault(); e.stopPropagation(); };
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => dom.dropZone.addEventListener(e, pd));
    ['dragenter', 'dragover'].forEach(e => dom.dropZone.addEventListener(e, () => dom.dropZone.classList.add('dragover')));
    ['dragleave', 'drop'].forEach(e => dom.dropZone.addEventListener(e, () => dom.dropZone.classList.remove('dragover')));
    dom.dropZone.addEventListener('drop', e => {
      Array.from(e.dataTransfer.files).forEach(f => {
        const dt = new DataTransfer(); dt.items.add(f);
        if (f.type.startsWith("video/")) { dom.uploadVideo.files = dt.files; dom.fileNameVideo.textContent = f.name; }
        else if (f.type.startsWith("image/")) { dom.uploadThumb.files = dt.files; dom.fileNameThumb.textContent = f.name; }
      });
    });
  };

  const navigateTo = path => window.location.hash = path;
  const resolveRoute = () => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("/video/")) return showDetailView(parseInt(hash.split("/")[2], 10));
    showHomeView();
  };

  document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI(); initDragAndDrop();
    window.addEventListener("hashchange", resolveRoute);
    dom.backBtn.onclick = () => navigateTo("/");
    dom.brandLink.onclick = e => { e.preventDefault(); navigateTo("/"); };
    dom.commentForm.onsubmit = handleCommentSubmit;
    dom.btnPromptLogin.onclick = dom.btnLogin.onclick = () => openAuthModal("login");
    dom.btnRegister.onclick = () => openAuthModal("register");
    dom.btnLogout.onclick = () => { clearSession(); showToast("Sesión cerrada", "success"); };
    dom.modalClose.onclick = () => dom.modalAuth.close();
    dom.authForm.onsubmit = handleAuthSubmit;
    dom.btnUploadOpen.onclick = () => state.token ? (dom.uploadForm.reset(), dom.uploadProgress.classList.add("view--hidden"), dom.uploadError.classList.add("view--hidden"), dom.modalUpload.showModal()) : showToast("Inicia sesión para subir", "error");
    dom.uploadClose.onclick = () => dom.modalUpload.close();
    dom.uploadForm.onsubmit = handleUploadSubmit;
    dom.uploadVideo.onchange = e => dom.fileNameVideo.textContent = e.target.files[0]?.name || "No seleccionado";
    dom.uploadThumb.onchange = e => dom.fileNameThumb.textContent = e.target.files[0]?.name || "No seleccionado";
    dom.btnDeleteVideo.onclick = () => state.currentVideo && dom.modalConfirm.showModal();
    dom.confirmCancel.onclick = () => dom.modalConfirm.close();
    dom.confirmOk.onclick = executeDelete;
    resolveRoute();
  });
})();
