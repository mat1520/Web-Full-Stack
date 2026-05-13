"use strict";

(function () {
  var API = "/api/v1";

var dom = {
  homeView:       document.getElementById("home-view"),
  detailView:     document.getElementById("detail-view"),
  videoGrid:      document.getElementById("video-grid"),
  categoryList:   document.getElementById("category-list"),
  backBtn:        document.getElementById("back-btn"),
  brandLink:      document.getElementById("brand-link"),
  mainVideo:      document.getElementById("main-video"),
  playerTitle:    document.getElementById("player-title"),
  playerMeta:     document.getElementById("player-meta"),
  playerDesc:     document.getElementById("player-description"),
  btnDeleteVideo: document.getElementById("btn-delete-video"),
  commentForm:    document.getElementById("comment-form"),
  commentContent: document.getElementById("comment-content"),
  commentsList:   document.getElementById("comments-list"),
  commentsCount:  document.getElementById("comments-count"),
  commentAuthPrompt: document.getElementById("comment-auth-prompt"),
  btnPromptLogin: document.getElementById("btn-prompt-login"),
  sidebarList:    document.getElementById("sidebar-list"),
  toast:          document.getElementById("toast"),
  authSection:    document.getElementById("auth-section"),
  userSection:    document.getElementById("user-section"),
  headerUsername: document.getElementById("header-username"),
  btnLogin:       document.getElementById("btn-login"),
  btnRegister:    document.getElementById("btn-register"),
  btnLogout:      document.getElementById("btn-logout"),
  btnUploadOpen:  document.getElementById("btn-upload-open"),
  modalAuth:      document.getElementById("modal-auth"),
  modalTitle:     document.getElementById("modal-title"),
  modalClose:     document.getElementById("modal-close"),
  authForm:       document.getElementById("auth-form"),
  authUsername:   document.getElementById("auth-username"),
  authEmail:      document.getElementById("auth-email"),
  authPassword:   document.getElementById("auth-password"),
  authError:      document.getElementById("auth-error"),
  authSubmit:     document.getElementById("auth-submit"),
  fieldEmail:     document.getElementById("field-email"),
  modalSwitch:    document.getElementById("modal-switch"),
  modalUpload:    document.getElementById("modal-upload"),
  uploadClose:    document.getElementById("upload-close"),
  uploadForm:     document.getElementById("upload-form"),
  uploadTitle:    document.getElementById("upload-title"),
  uploadDesc:     document.getElementById("upload-desc"),
  uploadCategory: document.getElementById("upload-category"),
  uploadVideo:    document.getElementById("upload-video"),
  uploadThumb:    document.getElementById("upload-thumb"),
  fileNameVideo:  document.getElementById("file-name-video"),
  fileNameThumb:  document.getElementById("file-name-thumb"),
  dropZone:       document.getElementById("drop-zone"),
  uploadProgress: document.getElementById("upload-progress"),
  uploadBar:      document.getElementById("upload-bar"),
  uploadText:     document.getElementById("upload-text"),
  uploadError:    document.getElementById("upload-error"),
  uploadSubmit:   document.getElementById("upload-submit"),
  modalConfirm:   document.getElementById("modal-confirm"),
  confirmCancel:  document.getElementById("confirm-cancel"),
  confirmOk:      document.getElementById("confirm-ok")
};

var state = {
  videos: [],
  currentVideo: null,
  activeCategory: null,
  recommendations: {},
  token: localStorage.getItem("sc_token") || null,
  user: JSON.parse(localStorage.getItem("sc_user") || "null"),
  authMode: "login"
};

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function cloneTemplate(id) {
  return document.getElementById(id).content.cloneNode(true);
}

function timeAgo(dateStr) {
  var diff = Date.now() - new Date(dateStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return mins + " min";
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h";
  var days = Math.floor(hrs / 24);
  if (days < 30) return days + "d";
  var months = Math.floor(days / 30);
  return months + " mes" + (months > 1 ? "es" : "");
}

function showToast(msg, type) {
  dom.toast.textContent = msg;
  dom.toast.className = "toast toast--visible" + (type === "success" ? " toast--success" : "");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function () { dom.toast.className = "toast"; }, 3500);
}

var api = {
  getVideos: function (category) {
    var url = API + "/videos";
    if (category) url += "?category=" + encodeURIComponent(category);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("Error " + r.status);
      return r.json();
    });
  },

  getVideo: function (id) {
    return fetch(API + "/videos/" + id).then(function (r) {
      if (!r.ok) throw new Error("Error " + r.status);
      return r.json();
    });
  },

  getRandomPicks: function () {
    return fetch(API + "/videos/random-picks").then(function (r) {
      if (!r.ok) throw new Error("Error " + r.status);
      return r.json();
    });
  },

  deleteVideo: function (id) {
    return fetch(API + "/videos/" + id, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + state.token }
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (e) {
        throw new Error(e.detail || "Error " + r.status);
      });
      return true;
    });
  },

  postComment: function (data) {
    return fetch(API + "/comments", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + state.token 
      },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (e) {
        throw new Error(e.detail || "Error " + r.status);
      });
      return r.json();
    });
  },

  authRequest: function (endpoint, data) {
    return fetch(API + "/auth/" + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (e) {
        throw new Error(e.detail || "Error " + r.status);
      });
      return r.json();
    });
  },

  uploadVideo: function (formData, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", API + "/videos/upload");
      xhr.setRequestHeader("Authorization", "Bearer " + state.token);
      xhr.upload.addEventListener("progress", function (e) {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      xhr.addEventListener("load", function () {
        if (xhr.status === 201) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          var err = {};
          try { err = JSON.parse(xhr.responseText); } catch (_) {}
          reject(new Error(err.detail || "Error " + xhr.status));
        }
      });
      xhr.addEventListener("error", function () { reject(new Error("Error de red")); });
      xhr.send(formData);
    });
  }
};

function saveSession(data) {
  state.token = data.access_token;
  state.user = data.user;
  localStorage.setItem("sc_token", data.access_token);
  localStorage.setItem("sc_user", JSON.stringify(data.user));
  updateAuthUI();
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("sc_token");
  localStorage.removeItem("sc_user");
  updateAuthUI();
}

function updateAuthUI() {
  if (state.user) {
    dom.authSection.classList.add("view--hidden");
    dom.userSection.classList.remove("view--hidden");
    dom.headerUsername.textContent = state.user.username;
    dom.commentAuthPrompt.classList.add("view--hidden");
    dom.commentForm.classList.remove("view--hidden");
  } else {
    dom.authSection.classList.remove("view--hidden");
    dom.userSection.classList.add("view--hidden");
    dom.commentAuthPrompt.classList.remove("view--hidden");
    dom.commentForm.classList.add("view--hidden");
  }
  updateOwnershipUI();
}

function updateOwnershipUI() {
  if (state.currentVideo && state.user && state.currentVideo.owner_id === state.user.id) {
    dom.btnDeleteVideo.classList.remove("view--hidden");
  } else {
    dom.btnDeleteVideo.classList.add("view--hidden");
  }
}

function openAuthModal(mode) {
  state.authMode = mode;
  dom.authForm.reset();
  dom.authError.classList.add("view--hidden");

  if (mode === "register") {
    dom.modalTitle.textContent = "Crear Cuenta";
    dom.fieldEmail.classList.remove("view--hidden");
    dom.authSubmit.textContent = "Registrarse";
    clearChildren(dom.modalSwitch);
    dom.modalSwitch.appendChild(document.createTextNode("¿Ya tienes cuenta? "));
    var link = document.createElement("button");
    link.className = "modal__switch-link";
    link.type = "button";
    link.textContent = "Inicia Sesión";
    link.addEventListener("click", function () { openAuthModal("login"); });
    dom.modalSwitch.appendChild(link);
  } else {
    dom.modalTitle.textContent = "Iniciar Sesión";
    dom.fieldEmail.classList.add("view--hidden");
    dom.authSubmit.textContent = "Entrar";
    clearChildren(dom.modalSwitch);
    dom.modalSwitch.appendChild(document.createTextNode("¿No tienes cuenta? "));
    var link2 = document.createElement("button");
    link2.className = "modal__switch-link";
    link2.type = "button";
    link2.textContent = "Regístrate";
    link2.addEventListener("click", function () { openAuthModal("register"); });
    dom.modalSwitch.appendChild(link2);
  }

  dom.modalAuth.showModal();
}

function handleAuthSubmit(e) {
  e.preventDefault();
  dom.authError.classList.add("view--hidden");
  dom.authSubmit.disabled = true;

  var data = {
    username: dom.authUsername.value.trim(),
    password: dom.authPassword.value
  };

  if (state.authMode === "register") {
    data.email = dom.authEmail.value.trim();
  }

  api.authRequest(state.authMode === "register" ? "register" : "login", data)
    .then(function (res) {
      saveSession(res);
      dom.modalAuth.close();
      showToast("Bienvenido, " + res.user.username, "success");
    })
    .catch(function (err) {
      dom.authError.textContent = err.message;
      dom.authError.classList.remove("view--hidden");
    })
    .finally(function () {
      dom.authSubmit.disabled = false;
    });
}

function openUploadModal() {
  if (!state.token) {
    showToast("Inicia sesión para subir videos", "error");
    return;
  }
  dom.uploadForm.reset();
  dom.uploadProgress.classList.add("view--hidden");
  dom.uploadError.classList.add("view--hidden");
  dom.uploadBar.style.width = "0%";
  dom.uploadText.textContent = "0%";
  dom.fileNameVideo.textContent = "No seleccionado";
  dom.fileNameThumb.textContent = "No seleccionado";
  dom.modalUpload.showModal();
}

function handleUploadSubmit(e) {
  e.preventDefault();
  dom.uploadError.classList.add("view--hidden");
  dom.uploadSubmit.disabled = true;
  dom.uploadProgress.classList.remove("view--hidden");

  var formData = new FormData();
  formData.append("title", dom.uploadTitle.value.trim());
  formData.append("description", dom.uploadDesc.value.trim());
  formData.append("category", dom.uploadCategory.value.trim());
  formData.append("video_file", dom.uploadVideo.files[0]);
  formData.append("thumbnail_file", dom.uploadThumb.files[0]);

  api.uploadVideo(formData, function (pct) {
    dom.uploadBar.style.width = pct + "%";
    dom.uploadText.textContent = pct + "%";
  })
    .then(function (video) {
      dom.modalUpload.close();
      state.videos = [];
      state.recommendations = {};
      showToast("Video subido correctamente", "success");
      navigateTo("/video/" + video.id);
    })
    .catch(function (err) {
      dom.uploadError.textContent = err.message;
      dom.uploadError.classList.remove("view--hidden");
    })
    .finally(function () {
      dom.uploadSubmit.disabled = false;
    });
}

function confirmDelete() {
  if (!state.currentVideo) return;
  dom.modalConfirm.showModal();
}

function executeDelete() {
  var id = state.currentVideo.id;
  dom.confirmOk.disabled = true;
  api.deleteVideo(id).then(function() {
    dom.modalConfirm.close();
    showToast("Video eliminado", "success");
    state.videos = [];
    state.recommendations = {};
    navigateTo("/");
  }).catch(function(err) {
    showToast(err.message, "error");
  }).finally(function() {
    dom.confirmOk.disabled = false;
  });
}

function renderVideoCard(video) {
  var frag = cloneTemplate("tmpl-video-card");
  var card = frag.querySelector(".video-card");
  card.dataset.videoId = video.id;
  var img = frag.querySelector(".video-card__thumbnail");
  img.src = video.thumbnail_url;
  img.alt = video.title;
  frag.querySelector(".video-card__duration").textContent = video.duration;
  frag.querySelector(".video-card__title").textContent = video.title;
  frag.querySelector(".video-card__category").textContent = video.category;
  card.addEventListener("click", function () { navigateTo("/video/" + video.id); });
  return frag;
}

function renderSkeletons(container, count) {
  clearChildren(container);
  for (var i = 0; i < count; i++) container.appendChild(cloneTemplate("tmpl-skeleton"));
}

function renderComment(comment, isOptimistic) {
  var frag = cloneTemplate("tmpl-comment");
  var el = frag.querySelector(".comment");
  if (isOptimistic) el.classList.add("comment--optimistic");
  var authorName = comment.author || "Desconocido";
  frag.querySelector(".comment__avatar").textContent = authorName.charAt(0).toUpperCase();
  frag.querySelector(".comment__author").textContent = authorName;
  frag.querySelector(".comment__date").textContent = timeAgo(comment.created_at || new Date().toISOString());
  frag.querySelector(".comment__content").textContent = comment.content;
  return frag;
}

function renderSidebarCard(video) {
  var frag = cloneTemplate("tmpl-sidebar-card");
  var card = frag.querySelector(".sidebar-card");
  card.dataset.videoId = video.id;
  var img = frag.querySelector(".sidebar-card__thumbnail");
  img.src = video.thumbnail_url;
  img.alt = video.title;
  frag.querySelector(".sidebar-card__duration").textContent = video.duration;
  frag.querySelector(".sidebar-card__title").textContent = video.title;
  frag.querySelector(".sidebar-card__meta").textContent = video.category;
  card.addEventListener("click", function () { navigateTo("/video/" + video.id); });
  return frag;
}

function renderEmptyState(container, message) {
  clearChildren(container);
  var section = document.createElement("section");
  section.className = "state-msg";
  var icon = document.createElement("span");
  icon.className = "state-msg__icon";
  icon.textContent = "";
  section.appendChild(icon);
  var text = document.createElement("p");
  text.className = "state-msg__text";
  text.textContent = message;
  section.appendChild(text);
  container.appendChild(section);
}

function renderErrorState(container, message, retryFn) {
  clearChildren(container);
  var section = document.createElement("section");
  section.className = "state-msg";
  var icon = document.createElement("span");
  icon.className = "state-msg__icon";
  icon.textContent = "";
  section.appendChild(icon);
  var text = document.createElement("p");
  text.className = "state-msg__text";
  text.textContent = message;
  section.appendChild(text);
  if (retryFn) {
    var btn = document.createElement("button");
    btn.className = "state-msg__retry";
    btn.textContent = "Reintentar";
    btn.addEventListener("click", retryFn);
    section.appendChild(btn);
  }
  container.appendChild(section);
}

function renderCategoryFilter(videos) {
  var cats = new Set();
  videos.forEach(function (v) { cats.add(v.category); });
  clearChildren(dom.categoryList);
  dom.categoryList.appendChild(createCategoryBtn("Todos", null));
  cats.forEach(function (cat) { dom.categoryList.appendChild(createCategoryBtn(cat, cat)); });
  updateActiveCategory(null);
}

function createCategoryBtn(label, category) {
  var li = document.createElement("li");
  li.setAttribute("role", "tab");
  var btn = document.createElement("button");
  btn.className = "category-filter__btn";
  btn.textContent = label;
  btn.dataset.category = category || "";
  btn.addEventListener("click", function () { filterByCategory(category); });
  li.appendChild(btn);
  return li;
}

function updateActiveCategory(category) {
  state.activeCategory = category;
  dom.categoryList.querySelectorAll(".category-filter__btn").forEach(function (btn) {
    var match = (btn.dataset.category || null) === (category || null);
    if (!category && btn.dataset.category === "") match = true;
    btn.classList.toggle("category-filter__btn--active", match);
    btn.setAttribute("aria-selected", match ? "true" : "false");
  });
}

function filterByCategory(category) {
  updateActiveCategory(category);
  var filtered = category
    ? state.videos.filter(function (v) { return v.category === category; })
    : state.videos;
  renderVideoGrid(filtered);
}

function renderVideoGrid(videos) {
  clearChildren(dom.videoGrid);
  if (videos.length === 0) {
    renderEmptyState(dom.videoGrid, "No hay videos en esta categoría");
    return;
  }
  var frag = document.createDocumentFragment();
  videos.forEach(function (v) { frag.appendChild(renderVideoCard(v)); });
  dom.videoGrid.appendChild(frag);
}

function showHomeView() {
  dom.detailView.classList.add("view--hidden");
  dom.homeView.classList.remove("view--hidden");
  dom.backBtn.classList.remove("header__back--visible");
  dom.mainVideo.pause();
  dom.mainVideo.removeAttribute("src");
  dom.mainVideo.load();
  state.currentVideo = null;
  updateOwnershipUI();

  if (state.videos.length > 0) {
    filterByCategory(state.activeCategory);
    return;
  }

  renderSkeletons(dom.videoGrid, 8);

  api.getVideos().then(function (videos) {
    state.videos = videos;
    renderCategoryFilter(state.videos);
    renderVideoGrid(state.videos);
  }).catch(function () {
    renderErrorState(dom.videoGrid, "Error al cargar los videos", showHomeView);
    showToast("Error de conexión con el servidor", "error");
  });
}

function startAutoplay() {
  dom.mainVideo.muted = true;
  var attempt = dom.mainVideo.play();
  if (attempt !== undefined) {
    attempt.then(function () {
      dom.mainVideo.muted = false;
    }).catch(function () {});
  }
}

function showDetailView(videoId) {
  dom.homeView.classList.add("view--hidden");
  dom.detailView.classList.remove("view--hidden");
  dom.backBtn.classList.add("header__back--visible");

  dom.playerTitle.textContent = "Cargando...";
  clearChildren(dom.playerMeta);
  dom.playerDesc.textContent = "";
  clearChildren(dom.commentsList);
  dom.commentsCount.textContent = "";

  api.getVideo(videoId).then(function (video) {
    state.currentVideo = video;
    updateOwnershipUI();
    dom.mainVideo.src = video.video_url;
    dom.mainVideo.poster = video.thumbnail_url;
    dom.mainVideo.load();
    dom.mainVideo.addEventListener("canplay", startAutoplay, { once: true });
    dom.playerTitle.textContent = video.title;
    dom.playerDesc.textContent = video.description;
    renderPlayerMeta(video);
    renderCommentsList(video.comments);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }).catch(function () {
    dom.playerTitle.textContent = "Video no encontrado";
    showToast("No se pudo cargar el video", "error");
  });

  loadRecommendations();
}

function renderPlayerMeta(video) {
  clearChildren(dom.playerMeta);
  var badge = document.createElement("span");
  badge.className = "player__category-badge";
  badge.textContent = video.category;
  dom.playerMeta.appendChild(badge);
  var dur = document.createElement("time");
  dur.textContent = video.duration;
  dom.playerMeta.appendChild(dur);
}

function renderCommentsList(comments) {
  clearChildren(dom.commentsList);
  dom.commentsCount.textContent = "(" + comments.length + ")";
  if (comments.length === 0) {
    renderEmptyState(dom.commentsList, "Sé el primero en comentar");
    return;
  }
  var sorted = comments.slice().sort(function (a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });
  var frag = document.createDocumentFragment();
  sorted.forEach(function (c) { frag.appendChild(renderComment(c, false)); });
  dom.commentsList.appendChild(frag);
}

function loadRecommendations() {
  clearChildren(dom.sidebarList);
  var promise = Object.keys(state.recommendations).length === 0
    ? api.getRandomPicks()
    : Promise.resolve(state.recommendations);

  promise.then(function (data) {
    state.recommendations = data;
    var all = [];
    Object.keys(data).forEach(function (cat) {
      data[cat].forEach(function (v) {
        if (!state.currentVideo || v.id !== state.currentVideo.id) all.push(v);
      });
    });
    var picks = all.sort(function () { return 0.5 - Math.random(); }).slice(0, 12);
    var frag = document.createDocumentFragment();
    picks.forEach(function (v) { frag.appendChild(renderSidebarCard(v)); });
    dom.sidebarList.appendChild(frag);
  }).catch(function () {
    var p = document.createElement("p");
    p.className = "state-msg__text";
    p.textContent = "No se pudieron cargar las recomendaciones";
    dom.sidebarList.appendChild(p);
  });
}

function handleCommentSubmit(e) {
  e.preventDefault();
  if (!state.user) {
    showToast("Inicia sesión primero", "error");
    return;
  }
  
  var content = dom.commentContent.value.trim();

  if (!content) {
    showToast("Escribe un comentario", "error");
    dom.commentContent.focus();
    return;
  }

  var submitBtn = dom.commentForm.querySelector(".comment-form__submit");
  submitBtn.disabled = true;

  var optimistic = {
    id: Date.now(),
    video_id: state.currentVideo.id,
    author: state.user.username,
    content: content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  var emptyMsg = dom.commentsList.querySelector(".state-msg");
  if (emptyMsg) clearChildren(dom.commentsList);

  dom.commentsList.insertBefore(renderComment(optimistic, true), dom.commentsList.firstChild);
  dom.commentsCount.textContent = "(" + (state.currentVideo.comments.length + 1) + ")";
  dom.commentContent.value = "";

  api.postComment({
    video_id: state.currentVideo.id,
    content: content
  }).then(function (saved) {
    state.currentVideo.comments.push(saved);
    var node = dom.commentsList.querySelector(".comment--optimistic");
    if (node) node.classList.remove("comment--optimistic");
    showToast("Comentario publicado", "success");
  }).catch(function (err) {
    var node = dom.commentsList.querySelector(".comment--optimistic");
    if (node) node.remove();
    dom.commentsCount.textContent = "(" + state.currentVideo.comments.length + ")";
    dom.commentContent.value = content;
    showToast(err.message || "Error al enviar el comentario", "error");
  }).finally(function () {
    submitBtn.disabled = false;
  });
}

function handleFileSelect(e) {
  var target = e.target;
  var nameEl = target.id === 'upload-video' ? dom.fileNameVideo : dom.fileNameThumb;
  if (target.files.length > 0) {
    nameEl.textContent = target.files[0].name;
  } else {
    nameEl.textContent = "No seleccionado";
  }
}

function initDragAndDrop() {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
    dom.dropZone.addEventListener(eventName, preventDefaults, false);
  });
  function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
  ['dragenter', 'dragover'].forEach(function(eventName) {
    dom.dropZone.addEventListener(eventName, function() { dom.dropZone.classList.add('dragover'); }, false);
  });
  ['dragleave', 'drop'].forEach(function(eventName) {
    dom.dropZone.addEventListener(eventName, function() { dom.dropZone.classList.remove('dragover'); }, false);
  });
  dom.dropZone.addEventListener('drop', function(e) {
    var dt = e.dataTransfer;
    var files = dt.files;
    for (var i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("video/")) {
        dom.uploadVideo.files = createFileList(files[i]);
        dom.fileNameVideo.textContent = files[i].name;
      } else if (files[i].type.startsWith("image/")) {
        dom.uploadThumb.files = createFileList(files[i]);
        dom.fileNameThumb.textContent = files[i].name;
      }
    }
  }, false);
}

function createFileList(file) {
  var dt = new DataTransfer();
  dt.items.add(file);
  return dt.files;
}

function navigateTo(path) {
  window.location.hash = path;
}

function resolveRoute() {
  var hash = window.location.hash.slice(1);
  if (hash.indexOf("/video/") === 0) {
    var id = hash.split("/")[2];
    if (id) { showDetailView(parseInt(id, 10)); return; }
  }
  showHomeView();
}

function init() {
  updateAuthUI();
  initDragAndDrop();
  window.addEventListener("hashchange", resolveRoute);
  dom.backBtn.addEventListener("click", function () { navigateTo("/"); });
  dom.brandLink.addEventListener("click", function (e) { e.preventDefault(); navigateTo("/"); });
  dom.commentForm.addEventListener("submit", handleCommentSubmit);
  dom.btnPromptLogin.addEventListener("click", function () { openAuthModal("login"); });

  dom.btnLogin.addEventListener("click", function () { openAuthModal("login"); });
  dom.btnRegister.addEventListener("click", function () { openAuthModal("register"); });
  dom.btnLogout.addEventListener("click", function () {
    clearSession();
    showToast("Sesión cerrada", "success");
  });
  dom.modalClose.addEventListener("click", function () { dom.modalAuth.close(); });
  dom.authForm.addEventListener("submit", handleAuthSubmit);

  dom.btnUploadOpen.addEventListener("click", openUploadModal);
  dom.uploadClose.addEventListener("click", function () { dom.modalUpload.close(); });
  dom.uploadForm.addEventListener("submit", handleUploadSubmit);
  dom.uploadVideo.addEventListener("change", handleFileSelect);
  dom.uploadThumb.addEventListener("change", handleFileSelect);

  dom.btnDeleteVideo.addEventListener("click", confirmDelete);
  dom.confirmCancel.addEventListener("click", function () { dom.modalConfirm.close(); });
  dom.confirmOk.addEventListener("click", executeDelete);

  resolveRoute();
}

document.addEventListener("DOMContentLoaded", init);

})();
