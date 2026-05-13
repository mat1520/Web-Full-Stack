"use strict";

(() => {
  const API = "/api/v1";
  const $ = (id) => document.getElementById(id);

  /* ── DOM refs ── */
  const dom = {
    homeView: $("home-view"), detailView: $("detail-view"), uploadView: $("upload-view"),
    videoGrid: $("video-grid"), categoryList: $("category-list"),
    backBtn: $("back-btn"), brandLink: $("brand-link"),
    mainVideo: $("main-video"), playerTitle: $("player-title"),
    playerMeta: $("player-meta"), playerDesc: $("player-description"),
    btnDeleteVideo: $("btn-delete-video"),
    commentForm: $("comment-form"), commentContent: $("comment-content"),
    commentsList: $("comments-list"), commentsCount: $("comments-count"),
    commentAuthPrompt: $("comment-auth-prompt"), btnPromptLogin: $("btn-prompt-login"),
    sidebarList: $("sidebar-list"), toast: $("toast"),
    authSection: $("auth-section"), userSection: $("user-section"),
    headerUsername: $("header-username"),
    btnLogin: $("btn-login"), btnRegister: $("btn-register"), btnLogout: $("btn-logout"),
    btnUploadOpen: $("btn-upload-open"),
    modalAuth: $("modal-auth"), modalTitle: $("modal-title"),
    modalClose: $("modal-close"), authForm: $("auth-form"),
    authUsername: $("auth-username"), authEmail: $("auth-email"),
    authPassword: $("auth-password"), authError: $("auth-error"),
    authSubmit: $("auth-submit"), fieldEmail: $("field-email"),
    modalSwitch: $("modal-switch"),
    uploadForm: $("upload-form"), uploadTitle: $("upload-title"),
    uploadDesc: $("upload-desc"), uploadCategory: $("upload-category"),
    uploadVideo: $("upload-video"), uploadThumb: $("upload-thumb"),
    fileNameVideo: $("file-name-video"), fileNameThumb: $("file-name-thumb"),
    dropZone: $("drop-zone"), uploadProgress: $("upload-progress"),
    uploadBar: $("upload-bar"), uploadText: $("upload-text"),
    uploadError: $("upload-error"), uploadSubmit: $("upload-submit"),
    modalConfirm: $("modal-confirm"), confirmCancel: $("confirm-cancel"), confirmOk: $("confirm-ok"),
    hamburgerBtn: $("hamburger-btn"), headerMenu: $("header-menu"),
  };

  /* ── State ── */
  const state = {
    videos: [], currentVideo: null, activeCategory: null,
    recommendations: {},
    token: localStorage.getItem("sc_token") || null,
    user: JSON.parse(localStorage.getItem("sc_user") || "null"),
    authMode: "login",
  };

  /* ── Helpers ── */
  const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild) };
  const clone = (id) => $(id).content.cloneNode(true);
  const hide = (el) => el.classList.add("view--hidden");
  const show = (el) => el.classList.remove("view--hidden");
  const toggle = (el, visible) => el.classList.toggle("view--hidden", !visible);

  const timeAgo = (d) => {
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    if (m < 1) return "ahora";
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    return days < 30 ? `${days}d` : `${Math.floor(days / 30)} mes(es)`;
  };

  let toastTimer;
  const showToast = (msg, type) => {
    dom.toast.textContent = msg;
    dom.toast.className = `toast toast--visible ${type === "success" ? "toast--success" : ""}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (dom.toast.className = "toast"), 3500);
  };

  /* ── API layer ── */
  const request = async (endpoint, opts = {}) => {
    const headers = opts.headers || {};
    if (state.token && !opts.noAuth) headers["Authorization"] = `Bearer ${state.token}`;
    if (opts.body && !(opts.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(`${API}${endpoint}`, { ...opts, headers });
    if (!res.ok) {
      let err = "Error de conexión";
      try { err = (await res.json()).detail || `Error ${res.status}` } catch {}
      throw new Error(err);
    }
    return res.status === 204 ? true : res.json();
  };

  const api = {
    getVideo: (id) => request(`/videos/${id}`),
    getRandomPicks: () => request(`/videos/random-picks?_=${Date.now()}`),
    deleteVideo: (id) => request(`/videos/${id}`, { method: "DELETE" }),
    postComment: (data) => request("/comments", { method: "POST", body: data }),
    auth: (ep, data) => request(`/auth/${ep}`, { method: "POST", body: data, noAuth: true }),
    upload: (fd, onProgress) => new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API}/videos/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${state.token}`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => xhr.status === 201
        ? resolve(JSON.parse(xhr.responseText))
        : reject(new Error(JSON.parse(xhr.responseText)?.detail || "Upload error"));
      xhr.onerror = () => reject(new Error("Error de red"));
      xhr.send(fd);
    }),
  };

  /* ── Auth helpers ── */
  const saveSession = (data) => {
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

  const updateAuthUI = () => {
    const ok = !!state.user;
    toggle(dom.authSection, !ok);
    toggle(dom.userSection, ok);
    toggle(dom.commentAuthPrompt, !ok);
    toggle(dom.commentForm, ok);
    if (ok) dom.headerUsername.textContent = state.user.username;
    dom.btnDeleteVideo.classList.toggle("view--hidden",
      !(state.currentVideo && state.user && state.currentVideo.owner_id === state.user.id));
  };

  /* ── Auth modal ── */
  const openAuthModal = (mode) => {
    state.authMode = mode;
    dom.authForm.reset();
    hide(dom.authError);
    const isReg = mode === "register";
    dom.modalTitle.textContent = isReg ? "Crear Cuenta" : "Iniciar Sesión";
    toggle(dom.fieldEmail, isReg);
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

  /* ── Form handlers ── */
  const handleAuth = async (e) => {
    e.preventDefault();
    hide(dom.authError);
    dom.authSubmit.disabled = true;
    const data = { username: dom.authUsername.value.trim(), password: dom.authPassword.value };
    if (state.authMode === "register") data.email = dom.authEmail.value.trim();
    try {
      const res = await api.auth(state.authMode, data);
      saveSession(res);
      dom.modalAuth.close();
      showToast(`Bienvenido, ${res.user.username}`, "success");
    } catch (err) {
      dom.authError.textContent = err.message;
      show(dom.authError);
    } finally { dom.authSubmit.disabled = false }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    hide(dom.uploadError);
    dom.uploadSubmit.disabled = true;
    const title = dom.uploadTitle.value.trim();
    const category = dom.uploadCategory.value.trim();
    const videoFile = dom.uploadVideo.files[0];
    const thumbFile = dom.uploadThumb.files[0];

    if (!title || !category || !videoFile || !thumbFile) {
      dom.uploadError.textContent = "Completa todos los campos y selecciona ambos archivos.";
      show(dom.uploadError);
      dom.uploadSubmit.disabled = false;
      return;
    }
    show(dom.uploadProgress);
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", dom.uploadDesc.value.trim());
    fd.append("category", category);
    fd.append("video_file", videoFile);
    fd.append("thumbnail_file", thumbFile);
    try {
      const video = await api.upload(fd, (pct) => {
        dom.uploadBar.style.width = `${pct}%`;
        dom.uploadText.textContent = `${pct}%`;
      });
      state.videos = [];
      state.recommendations = {};
      showToast("Video subido correctamente", "success");
      navigateTo(`/video/${video.id}`);
    } catch (err) {
      dom.uploadError.textContent = err.message;
      show(dom.uploadError);
    } finally { dom.uploadSubmit.disabled = false }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!state.user) return showToast("Inicia sesión primero", "error");
    const content = dom.commentContent.value.trim();
    if (!content) return dom.commentContent.focus();

    const submitBtn = dom.commentForm.querySelector("[type=submit]");
    submitBtn.disabled = true;
    const optimistic = {
      id: Date.now(), video_id: state.currentVideo.id,
      author: state.user.username, content, created_at: new Date().toISOString(),
    };
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
    } finally { submitBtn.disabled = false }
  };

  const handleDelete = async () => {
    dom.confirmOk.disabled = true;
    try {
      await api.deleteVideo(state.currentVideo.id);
      dom.modalConfirm.close();
      showToast("Video eliminado", "success");
      state.videos = [];
      state.recommendations = {};
      navigateTo("/");
    } catch (err) { showToast(err.message, "error") }
    finally { dom.confirmOk.disabled = false }
  };

  /* ── Render helpers ── */
  const renderState = (container, msg, retryFn) => {
    clear(container);
    const s = document.createElement("section");
    s.className = "state-msg";
    const p = document.createElement("p");
    p.className = "state-msg__text";
    p.textContent = msg;
    s.appendChild(p);
    if (retryFn) {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = "Reintentar";
      btn.onclick = retryFn;
      s.appendChild(btn);
    }
    container.appendChild(s);
  };

  const renderComment = (c, isOpt) => {
    const f = clone("tmpl-comment");
    if (isOpt) f.querySelector(".comment").classList.add("comment--optimistic");
    const author = c.author || "Desconocido";
    f.querySelector(".comment__avatar").textContent = author[0].toUpperCase();
    f.querySelector(".comment__author").textContent = author;
    f.querySelector(".comment__date").textContent = timeAgo(c.created_at);
    f.querySelector(".comment__content").textContent = c.content;
    return f;
  };

  const CARD_MAP = {
    "tmpl-video-card": { root: ".video-card", thumb: ".video-card__thumbnail", dur: ".video-card__duration", title: ".video-card__title", meta: ".video-card__category" },
    "tmpl-sidebar-card": { root: ".sidebar-card", thumb: ".sidebar-card__thumbnail", dur: ".sidebar-card__duration", title: ".sidebar-card__title", meta: ".sidebar-card__meta" },
  };

  const renderCard = (v, tmpl) => {
    const c = CARD_MAP[tmpl], f = clone(tmpl);
    f.querySelector(c.root).dataset.videoId = v.id;
    const img = f.querySelector(c.thumb);
    img.src = v.thumbnail_url;
    img.alt = v.title;
    f.querySelector(c.dur).textContent = v.duration;
    f.querySelector(c.title).textContent = v.title;
    f.querySelector(c.meta).textContent = v.category;
    f.querySelector(c.root).onclick = () => navigateTo(`/video/${v.id}`);
    return f;
  };

  /* ── Category filter ── */
  const renderCategories = (videos) => {
    const cats = new Set(videos.map((v) => v.category));
    clear(dom.categoryList);
    const addBtn = (label, val) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "category-filter__btn";
      btn.textContent = label;
      btn.dataset.category = val || "";
      btn.onclick = () => filterByCategory(val);
      li.appendChild(btn);
      dom.categoryList.appendChild(li);
    };
    addBtn("Todos", null);
    cats.forEach((c) => addBtn(c, c));
    setActiveCategory(null);
  };

  const setActiveCategory = (cat) => {
    state.activeCategory = cat;
    dom.categoryList.querySelectorAll(".category-filter__btn").forEach((btn) => {
      const match = (btn.dataset.category || null) === (cat || null) || (!cat && btn.dataset.category === "");
      btn.classList.toggle("category-filter__btn--active", match);
    });
  };

  const filterByCategory = (cat) => {
    setActiveCategory(cat);
    const list = cat ? state.videos.filter((v) => v.category === cat) : state.videos;
    clear(dom.videoGrid);
    if (!list.length) return renderState(dom.videoGrid, "No hay videos en esta categoría");
    const frag = document.createDocumentFragment();
    list.forEach((v) => frag.appendChild(renderCard(v, "tmpl-video-card")));
    dom.videoGrid.appendChild(frag);
  };

  /* ── Views ── */
  const VIEWS = [dom.homeView, dom.detailView, dom.uploadView];
  const switchView = (active, showBack) => {
    VIEWS.forEach((v) => v.classList.add("view--hidden"));
    active.classList.remove("view--hidden");
    dom.backBtn.classList.toggle("header__back--visible", showBack);
  };

  const showHome = async () => {
    switchView(dom.homeView, false);
    dom.mainVideo.pause();
    dom.mainVideo.removeAttribute("src");
    dom.mainVideo.load();
    state.currentVideo = null;
    updateAuthUI();
    clear(dom.videoGrid);
    for (let i = 0; i < 8; i++) dom.videoGrid.appendChild(clone("tmpl-skeleton"));
    try {
      const picks = await api.getRandomPicks();
      state.recommendations = picks;
      const seen = new Set();
      state.videos = Object.values(picks).flat()
        .filter((v) => { if (seen.has(v.id)) return false; seen.add(v.id); return true })
        .sort(() => 0.5 - Math.random());
      renderCategories(state.videos);
      filterByCategory(state.activeCategory);
    } catch {
      renderState(dom.videoGrid, "Error al cargar los videos", showHome);
      showToast("Error de conexión", "error");
    }
  };

  const showDetail = async (id) => {
    switchView(dom.detailView, true);
    dom.playerTitle.textContent = "Cargando...";
    clear(dom.playerMeta);
    dom.playerDesc.textContent = "";
    clear(dom.commentsList);
    dom.commentsCount.textContent = "";

    try {
      const v = await api.getVideo(id);
      state.currentVideo = v;
      updateAuthUI();
      dom.mainVideo.src = v.video_url;
      dom.mainVideo.poster = v.thumbnail_url;
      dom.mainVideo.muted = true;
      dom.mainVideo.play().then(() => (dom.mainVideo.muted = false)).catch(() => {});
      dom.playerTitle.textContent = v.title;
      dom.playerDesc.textContent = v.description;

      dom.playerMeta.textContent = "";
      const badge = document.createElement("span");
      badge.className = "player__category-badge";
      badge.textContent = v.category;
      const timeEl = document.createElement("time");
      timeEl.textContent = v.duration;
      dom.playerMeta.appendChild(badge);
      dom.playerMeta.appendChild(timeEl);

      dom.commentsCount.textContent = `(${v.comments.length})`;
      if (!v.comments.length) {
        renderState(dom.commentsList, "Sé el primero en comentar");
      } else {
        const frag = document.createDocumentFragment();
        v.comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .forEach((c) => frag.appendChild(renderComment(c)));
        dom.commentsList.appendChild(frag);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      dom.playerTitle.textContent = "Video no encontrado";
      showToast("No se pudo cargar el video", "error");
    }

    try {
      if (!Object.keys(state.recommendations).length) state.recommendations = await api.getRandomPicks();
      const all = Object.values(state.recommendations).flat().filter((v) => v.id !== id);
      const picks = all.sort(() => 0.5 - Math.random()).slice(0, 12);
      clear(dom.sidebarList);
      const frag = document.createDocumentFragment();
      picks.forEach((v) => frag.appendChild(renderCard(v, "tmpl-sidebar-card")));
      dom.sidebarList.appendChild(frag);
    } catch {
      clear(dom.sidebarList);
      const p = document.createElement("p");
      p.className = "state-msg__text";
      p.textContent = "No se pudieron cargar las recomendaciones";
      dom.sidebarList.appendChild(p);
    }
  };

  const showUpload = () => {
    if (!state.token) { showToast("Inicia sesión para subir videos", "error"); return navigateTo("/") }
    switchView(dom.uploadView, true);
    dom.uploadForm.reset();
    dom.fileNameVideo.textContent = "Ningún video";
    dom.fileNameThumb.textContent = "Ninguna miniatura";
    hide(dom.uploadProgress);
    hide(dom.uploadError);
  };

  /* ── Drag & drop ── */
  const initDrop = () => {
    const pd = (e) => { e.preventDefault(); e.stopPropagation() };
    ["dragenter", "dragover", "dragleave", "drop"].forEach((e) => dom.dropZone.addEventListener(e, pd));
    ["dragenter", "dragover"].forEach((e) => dom.dropZone.addEventListener(e, () => dom.dropZone.classList.add("dragover")));
    ["dragleave", "drop"].forEach((e) => dom.dropZone.addEventListener(e, () => dom.dropZone.classList.remove("dragover")));
    dom.dropZone.addEventListener("drop", (e) => {
      Array.from(e.dataTransfer.files).forEach((f) => {
        const dt = new DataTransfer();
        dt.items.add(f);
        if (f.type.startsWith("video/")) { dom.uploadVideo.files = dt.files; dom.fileNameVideo.textContent = f.name }
        else if (f.type.startsWith("image/")) { dom.uploadThumb.files = dt.files; dom.fileNameThumb.textContent = f.name }
      });
    });
  };

  /* ── Router ── */
  const navigateTo = (path) => (window.location.hash = path);
  const resolveRoute = () => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("/video/")) return showDetail(parseInt(hash.split("/")[2], 10));
    if (hash === "/upload") return showUpload();
    showHome();
  };

  /* ── Init ── */
  document.addEventListener("DOMContentLoaded", () => {
    const closeMenu = () => {
      dom.hamburgerBtn.classList.remove("header__hamburger--open");
      dom.headerMenu.classList.remove("header__menu--open");
      dom.hamburgerBtn.setAttribute("aria-expanded", "false");
    };
    dom.hamburgerBtn.onclick = () => {
      const open = dom.headerMenu.classList.toggle("header__menu--open");
      dom.hamburgerBtn.classList.toggle("header__hamburger--open", open);
      dom.hamburgerBtn.setAttribute("aria-expanded", String(open));
    };
    window.addEventListener("hashchange", closeMenu);
    dom.headerMenu.addEventListener("click", (e) => { if (e.target.closest(".btn")) closeMenu() });

    updateAuthUI();
    initDrop();
    window.addEventListener("hashchange", resolveRoute);

    dom.backBtn.onclick = () => navigateTo("/");
    dom.brandLink.onclick = (e) => { e.preventDefault(); navigateTo("/") };
    dom.commentForm.onsubmit = handleComment;
    dom.btnPromptLogin.onclick = dom.btnLogin.onclick = () => openAuthModal("login");
    dom.btnRegister.onclick = () => openAuthModal("register");
    dom.btnLogout.onclick = () => { clearSession(); showToast("Sesión cerrada", "success") };
    dom.modalClose.onclick = () => dom.modalAuth.close();
    dom.authForm.onsubmit = handleAuth;
    dom.btnUploadOpen.onclick = () => {
      if (!state.token) return showToast("Inicia sesión para subir videos", "error");
      navigateTo("/upload");
    };
    dom.uploadForm.onsubmit = handleUpload;
    dom.uploadVideo.onchange = (e) => (dom.fileNameVideo.textContent = e.target.files[0]?.name || "No seleccionado");
    dom.uploadThumb.onchange = (e) => (dom.fileNameThumb.textContent = e.target.files[0]?.name || "No seleccionado");
    dom.btnDeleteVideo.onclick = () => state.currentVideo && dom.modalConfirm.showModal();
    dom.confirmCancel.onclick = () => dom.modalConfirm.close();
    dom.confirmOk.onclick = handleDelete;
    resolveRoute();
  });
})();
