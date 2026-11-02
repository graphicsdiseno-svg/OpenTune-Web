(() => {
  const tracks = [
    { id: "cielo-lento", title: "Cielo lento", artist: "Nora Sol", album: "Luz de tarde", seconds: 184, bpm: 86, root: 261.63, colors: ["#624866", "#ca9b9d"], glyph: "☼", playlists: ["Para ti", "Ritmo lento"] },
    { id: "casi-azul", title: "Casi azul", artist: "Mar de Fondo", album: "Nuevos rumbos", seconds: 201, bpm: 104, root: 293.66, colors: ["#355b75", "#90b6c1"], glyph: "≈", playlists: ["Nuevos descubrimientos"] },
    { id: "otra-orilla", title: "La otra orilla", artist: "Isla Clara", album: "Días de sal", seconds: 176, bpm: 94, root: 329.63, colors: ["#7a4e42", "#dfb78a"], glyph: "◉", playlists: ["Para ti"] },
    { id: "luz-entre-hojas", title: "Luz entre hojas", artist: "Nora Sol", album: "Luz de tarde", seconds: 219, bpm: 78, root: 246.94, colors: ["#496348", "#c5bd82"], glyph: "❋", playlists: ["Ritmo lento"] },
    { id: "pasos-de-nube", title: "Pasos de nube", artist: "Línea Serena", album: "Aire abierto", seconds: 193, bpm: 112, root: 349.23, colors: ["#565077", "#c2a8d7"], glyph: "☁", playlists: ["Nuevos descubrimientos"] },
    { id: "brisa-morada", title: "Brisa morada", artist: "Mar de Fondo", album: "Nuevos rumbos", seconds: 168, bpm: 88, root: 277.18, colors: ["#634d71", "#d0a6bc"], glyph: "✳", playlists: ["Para ti", "Ritmo lento"] },
    { id: "caminos-de-luna", title: "Caminos de luna", artist: "Isla Clara", album: "Días de sal", seconds: 207, bpm: 100, root: 311.13, colors: ["#343f69", "#98a1cb"], glyph: "☾", playlists: ["Nuevos descubrimientos"] },
    { id: "domingo-nuevo", title: "Domingo nuevo", artist: "Línea Serena", album: "Aire abierto", seconds: 189, bpm: 108, root: 392, colors: ["#73533d", "#e0b875"], glyph: "✺", playlists: ["Para ti"] }
  ];

  const defaultPlaylists = [
    { name: "Para ti", tracks: ["cielo-lento", "otra-orilla", "brisa-morada", "domingo-nuevo"] },
    { name: "Nuevos descubrimientos", tracks: ["casi-azul", "pasos-de-nube", "caminos-de-luna"] },
    { name: "Ritmo lento", tracks: ["cielo-lento", "luz-entre-hojas", "brisa-morada"] },
    { name: "Mi biblioteca", tracks: tracks.map(track => track.id) }
  ];

  const state = {
    view: "home",
    playlist: null,
    currentId: null,
    queue: tracks.map(track => track.id),
    favorites: loadList("sonora-favorites").filter(id => tracks.some(track => track.id === id)),
    customPlaylists: loadList("sonora-playlists")
      .filter(playlist => playlist && typeof playlist.name === "string" && Array.isArray(playlist.tracks))
      .map(playlist => ({ ...playlist, tracks: playlist.tracks.filter(id => tracks.some(track => track.id === id)) })),
    playlistTracks: loadRecord("sonora-playlist-tracks"),
    playing: false,
    shuffled: false,
    repeating: false,
    currentTime: 0,
    startedAt: 0,
    volume: 0.72,
    audioContext: null,
    synthTimer: null,
    synthStep: 0,
    toastTimer: null,
    promptEvent: null,
    previousViews: [],
    forwardViews: []
  };

  const els = {
    pageTitle: document.getElementById("page-title"),
    greeting: document.getElementById("greeting"),
    shelfTitle: document.getElementById("shelf-title"),
    tracksTitle: document.getElementById("tracks-title"),
    albumGrid: document.getElementById("album-grid"),
    trackList: document.getElementById("track-list"),
    emptyState: document.getElementById("empty-state"),
    playlistNav: document.getElementById("playlist-nav"),
    search: document.getElementById("search-input"),
    playButton: document.getElementById("play-button"),
    seekBar: document.getElementById("seek-bar"),
    elapsed: document.getElementById("elapsed-time"),
    duration: document.getElementById("duration-time"),
    playerTitle: document.getElementById("player-title"),
    playerArtist: document.getElementById("player-artist"),
    playerArt: document.getElementById("player-art"),
    likeCurrent: document.getElementById("like-current"),
    volume: document.getElementById("volume-bar"),
    repeatButton: document.getElementById("repeat-button"),
    shuffleButton: document.getElementById("shuffle-button"),
    dialog: document.getElementById("playlist-dialog"),
    playlistName: document.getElementById("playlist-name"),
    addDialog: document.getElementById("add-to-playlist-dialog"),
    playlistSelect: document.getElementById("playlist-select"),
    toast: document.getElementById("toast")
  };
  let trackToAdd = null;

  function loadList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(value)) return value;
      throw new TypeError(`El valor guardado para ${key} no es una lista.`);
    } catch (error) {
      console.error(`No se pudo leer ${key}:`, error);
      return [];
    }
  }

  function loadRecord(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "{}");
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
      throw new TypeError(`El valor guardado para ${key} no es un objeto.`);
    } catch (error) {
      console.error(`No se pudo leer ${key}:`, error);
      return {};
    }
  }

  function saveState() {
    try {
      localStorage.setItem("sonora-favorites", JSON.stringify(state.favorites));
      localStorage.setItem("sonora-playlists", JSON.stringify(state.customPlaylists));
      localStorage.setItem("sonora-playlist-tracks", JSON.stringify(state.playlistTracks));
    } catch (error) {
      console.error("No se pudo guardar la biblioteca de Sonora:", error);
      showToast("No pudimos guardar los cambios en este dispositivo.");
    }
  }

  function allPlaylists() {
    return [
      ...defaultPlaylists.map(playlist => ({
        ...playlist,
        tracks: Array.isArray(state.playlistTracks[playlist.name])
          ? state.playlistTracks[playlist.name].filter(id => tracks.some(track => track.id === id))
          : [...playlist.tracks]
      })),
      ...state.customPlaylists
    ];
  }

  function getTrack(id) {
    return tracks.find(track => track.id === id);
  }

  function getActiveTracks() {
    const query = els.search.value.trim().toLocaleLowerCase("es");
    let result = tracks;
    if (state.view === "favorites") result = tracks.filter(track => state.favorites.includes(track.id));
    if (state.view === "library") {
      const liked = tracks.filter(track => state.favorites.includes(track.id));
      result = liked.length ? liked : tracks;
    }
    if (state.view === "playlist" && state.playlist) {
      const playlist = allPlaylists().find(item => item.name === state.playlist);
      result = playlist ? tracks.filter(track => playlist.tracks.includes(track.id)) : [];
    }
    if (query) {
      result = result.filter(track => `${track.title} ${track.artist} ${track.album}`.toLocaleLowerCase("es").includes(query));
    }
    return result;
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }

  function artworkStyle(track) {
    return `background: radial-gradient(circle at 35% 25%, ${track.colors[1]}, transparent 55%), linear-gradient(145deg, ${track.colors[0]}, ${track.colors[1]});`;
  }

  function renderPlaylists() {
    els.playlistNav.innerHTML = allPlaylists().map((playlist, index) => `
      <button class="playlist-link${state.view === "playlist" && state.playlist === playlist.name ? " is-active" : ""}" data-playlist="${escapeAttribute(playlist.name)}">
        <span class="playlist-symbol" aria-hidden="true">${index === 0 ? "✳" : index === 1 ? "◒" : index === 2 ? "〰" : "♫"}</span>
        <span>${escapeHtml(playlist.name)}</span>
      </button>`).join("");
  }

  function renderAlbums(activeTracks) {
    const uniqueAlbums = [];
    for (const track of activeTracks) {
      if (!uniqueAlbums.some(item => item.album === track.album)) uniqueAlbums.push(track);
    }
    const cards = uniqueAlbums.slice(0, 4);
    els.albumGrid.innerHTML = cards.map(track => `
      <article class="album-card" data-album="${escapeAttribute(track.album)}">
        <div class="album-art" style="${artworkStyle(track)}">
          <span class="album-glyph" aria-hidden="true">${track.glyph}</span>
          <button class="album-play" data-play-album="${escapeAttribute(track.album)}" aria-label="Reproducir ${escapeAttribute(track.album)}">▶</button>
        </div>
        <div class="album-copy"><strong>${escapeHtml(track.album)}</strong><span>${escapeHtml(track.artist)} · Selección original</span></div>
      </article>`).join("");
  }

  function renderTracks(activeTracks) {
    els.trackList.innerHTML = activeTracks.map((track, index) => `
      <div class="track-row${state.currentId === track.id && state.playing ? " is-playing" : ""}" role="listitem" data-track-row="${track.id}">
        <span class="track-number">${state.currentId === track.id && state.playing ? "♪" : String(index + 1).padStart(2, "0")}</span>
        <button class="track-main" data-play="${track.id}" aria-label="Reproducir ${escapeAttribute(track.title)}">
          <span class="track-art" style="${artworkStyle(track)}" aria-hidden="true">${track.glyph}</span>
          <span class="track-text"><strong>${escapeHtml(track.title)}</strong><span>${escapeHtml(track.artist)}</span></span>
        </button>
        <span class="track-album">${escapeHtml(track.album)}</span>
        <span class="track-duration">${formatTime(track.seconds)}</span>
        <button class="track-like${state.favorites.includes(track.id) ? " is-liked" : ""}" data-like="${track.id}" aria-label="${state.favorites.includes(track.id) ? "Quitar de" : "Añadir a"} Me gusta" aria-pressed="${state.favorites.includes(track.id)}">♡</button>
        <button class="track-add" data-add="${track.id}" aria-label="Añadir ${escapeAttribute(track.title)} a una lista">+</button>
      </div>`).join("");
    els.emptyState.hidden = activeTracks.length > 0;
  }

  function render() {
    const names = { home: greetingTitle(), explore: "Explora tu próximo sonido", favorites: "Lo que te gusta", library: "Tu biblioteca", playlist: state.playlist || "Tu lista" };
    const titles = { home: "Tu próxima canción favorita", explore: "Descubre algo nuevo", favorites: "Tus favoritas", library: "Tu biblioteca", playlist: state.playlist || "Tu lista" };
    const activeTracks = getActiveTracks();
    els.pageTitle.textContent = names[state.view];
    els.shelfTitle.textContent = titles[state.view];
    els.tracksTitle.textContent = state.view === "favorites" ? "Canciones que guardaste" : "Escucha y descubre";
    els.greeting.textContent = state.view === "home" ? "TU ESPACIO, TU SONIDO" : "UN SONIDO PARA CADA MOMENTO";
    document.querySelectorAll("[data-view]").forEach(button => {
      const selected = button.dataset.view === state.view;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-current", selected ? "page" : "false");
    });
    document.querySelectorAll(".quick-pick").forEach(button => {
      button.hidden = state.view !== "home";
    });
    renderPlaylists();
    renderAlbums(activeTracks);
    renderTracks(activeTracks);
    updatePlayer();
  }

  function setView(view, playlist = null, addHistory = true) {
    if (addHistory && (state.view !== view || state.playlist !== playlist)) {
      state.previousViews.push({ view: state.view, playlist: state.playlist });
      state.forwardViews = [];
    }
    state.view = view;
    state.playlist = playlist;
    render();
  }

  function setQueue(activeTracks) {
    state.queue = activeTracks.map(track => track.id);
  }

  function updatePlayer() {
    const track = getTrack(state.currentId);
    els.playButton.disabled = !track;
    els.playButton.textContent = state.playing ? "Ⅱ" : "▶";
    els.playButton.setAttribute("aria-label", state.playing ? "Pausar" : "Reproducir");
    els.likeCurrent.classList.toggle("is-liked", !!track && state.favorites.includes(track.id));
    els.likeCurrent.setAttribute("aria-pressed", String(!!track && state.favorites.includes(track.id)));
    if (!track) return;
    els.playerTitle.textContent = track.title;
    els.playerArtist.textContent = `${track.artist} · Muestra original`;
    els.playerArt.setAttribute("style", artworkStyle(track));
    els.playerArt.innerHTML = `<span aria-hidden="true">${track.glyph}</span>`;
    els.elapsed.textContent = formatTime(state.currentTime);
    els.duration.textContent = formatTime(track.seconds);
    els.seekBar.disabled = false;
    els.seekBar.value = String(Math.round(state.currentTime / track.seconds * 100));
    document.querySelectorAll(".track-row").forEach(row => row.classList.toggle("is-playing", row.dataset.trackRow === track.id && state.playing));
  }

  async function getAudioContext() {
    if (!state.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("Este navegador no es compatible con la reproducción de audio.");
      state.audioContext = new AudioContext();
    }
    if (state.audioContext.state === "suspended") await state.audioContext.resume();
    return state.audioContext;
  }

  function tone(context, frequency, start, duration, volume, type = "sine", endFrequency = null) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * state.volume), start + .018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  }

  function playSynthStep() {
    const track = getTrack(state.currentId);
    if (!track || !state.audioContext || !state.playing) return;
    const context = state.audioContext;
    const now = context.currentTime + .025;
    const stepDuration = 60 / track.bpm / 2;
    const scale = [0, 3, 5, 7, 10, 12, 10, 7, 5, 3, 7, 10, 12, 10, 7, 5];
    const semitones = scale[state.synthStep % scale.length];
    if (state.synthStep % 2 === 0) {
      tone(context, track.root * Math.pow(2, semitones / 12), now, stepDuration * .85, .09, "triangle");
    }
    if (state.synthStep % 4 === 0) {
      tone(context, track.root / 2, now, stepDuration * .8, .15, "sine", track.root / 3);
    }
    if (state.synthStep % 8 === 4) {
      tone(context, track.root * 2.98, now, .09, .022, "sine");
    }
    state.synthStep += 1;
  }

  function stopSynth() {
    if (state.synthTimer) window.clearInterval(state.synthTimer);
    state.synthTimer = null;
  }

  function startSynth() {
    stopSynth();
    state.synthStep = 0;
    playSynthStep();
    const track = getTrack(state.currentId);
    if (track) state.synthTimer = window.setInterval(playSynthStep, 60000 / track.bpm / 2);
  }

  async function playTrack(id, queueOverride = null) {
    const track = getTrack(id);
    if (!track) return;
    const activeTracks = getActiveTracks();
    setQueue(queueOverride || (activeTracks.some(item => item.id === id) ? activeTracks : tracks));
    if (!state.queue.includes(id)) state.queue.unshift(id);
    state.currentId = id;
    state.currentTime = 0;
    state.startedAt = Date.now();
    state.playing = true;
    updatePlayer();
    try {
      await getAudioContext();
      startSynth();
      updatePlayer();
    } catch (error) {
      state.playing = false;
      stopSynth();
      updatePlayer();
      console.error("No se pudo iniciar la reproducción:", error);
      showToast("No pudimos iniciar el audio en este navegador.");
    }
  }

  function pausePlayback() {
    if (!state.playing) return;
    state.currentTime = Math.min(getTrack(state.currentId).seconds, state.currentTime + (Date.now() - state.startedAt) / 1000);
    state.playing = false;
    stopSynth();
    updatePlayer();
  }

  async function resumePlayback() {
    if (!state.currentId) {
      const first = getActiveTracks()[0] || tracks[0];
      await playTrack(first.id);
      return;
    }
    state.playing = true;
    state.startedAt = Date.now();
    updatePlayer();
    try {
      await getAudioContext();
      startSynth();
    } catch (error) {
      state.playing = false;
      stopSynth();
      updatePlayer();
      console.error("No se pudo reanudar el audio:", error);
      showToast("No pudimos reanudar el audio en este navegador.");
    }
  }

  async function togglePlayback() {
    if (state.playing) pausePlayback();
    else await resumePlayback();
  }

  async function playAdjacent(direction) {
    if (!state.queue.length) setQueue(tracks);
    const currentIndex = state.queue.indexOf(state.currentId);
    let nextIndex = currentIndex + direction;
    if (state.shuffled && direction > 0 && state.queue.length > 1) {
      do { nextIndex = Math.floor(Math.random() * state.queue.length); } while (nextIndex === currentIndex);
    }
    if (nextIndex < 0) nextIndex = state.queue.length - 1;
    if (nextIndex >= state.queue.length) nextIndex = 0;
    await playTrack(state.queue[nextIndex], state.queue.map(getTrack).filter(Boolean));
  }

  function toggleFavorite(id) {
    const index = state.favorites.indexOf(id);
    if (index >= 0) state.favorites.splice(index, 1);
    else state.favorites.push(id);
    saveState();
    render();
    showToast(index >= 0 ? "Quitada de Me gusta" : "Añadida a Me gusta");
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2300);
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function createPlaylist(name) {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (allPlaylists().some(item => item.name.toLocaleLowerCase("es") === cleanName.toLocaleLowerCase("es"))) {
      showToast("Ya existe una lista con ese nombre.");
      return;
    }
    state.customPlaylists.push({ name: cleanName, tracks: [] });
    saveState();
    els.dialog.close();
    els.playlistName.value = "";
    setView("playlist", cleanName);
    showToast(`Lista «${cleanName}» creada`);
  }

  function updateClock() {
    if (!state.playing) return;
    const track = getTrack(state.currentId);
    if (!track) return;
    state.currentTime = Math.min(track.seconds, state.currentTime + (Date.now() - state.startedAt) / 1000);
    state.startedAt = Date.now();
    if (state.currentTime >= track.seconds) {
      if (state.repeating) {
        state.currentTime = 0;
        state.startedAt = Date.now();
        startSynth();
      } else {
        playAdjacent(1);
      }
    }
    updatePlayer();
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const viewButton = event.target.closest("[data-view]");
      if (viewButton) {
        setView(viewButton.dataset.view);
        return;
      }
      const playlistButton = event.target.closest("[data-playlist]");
      if (playlistButton) {
        const name = playlistButton.dataset.playlist;
        if (name === "Mi biblioteca") setView("library");
        else setView("playlist", name);
        if (playlistButton.classList.contains("quick-play")) {
          const playlistTracks = getActiveTracks();
          if (playlistTracks.length) playTrack(playlistTracks[0].id, playlistTracks);
        }
        return;
      }
      const playButton = event.target.closest("[data-play]");
      const albumPlayButton = event.target.closest("[data-play-album]");
      if (albumPlayButton) {
        const albumTracks = tracks.filter(track => track.album === albumPlayButton.dataset.playAlbum);
        playTrack(albumTracks[0].id, albumTracks);
        return;
      }
      if (playButton) {
        playTrack(playButton.dataset.play);
        return;
      }
      const likeButton = event.target.closest("[data-like]");
      if (likeButton) {
        toggleFavorite(likeButton.dataset.like);
        return;
      }
      const addButton = event.target.closest("[data-add]");
      if (addButton) {
        trackToAdd = addButton.dataset.add;
        els.playlistSelect.innerHTML = allPlaylists().map(playlist =>
          `<option value="${escapeAttribute(playlist.name)}">${escapeHtml(playlist.name)}</option>`
        ).join("");
        els.addDialog.showModal();
        return;
      }
      const quickPick = event.target.closest(".quick-pick");
      if (quickPick) {
        const name = quickPick.dataset.playlist;
        if (name === "Mi biblioteca") setView("library");
        else setView("playlist", name);
        return;
      }
      const albumCard = event.target.closest(".album-card");
      if (albumCard) {
        const albumTracks = tracks.filter(track => track.album === albumCard.dataset.album);
        playTrack(albumTracks[0].id, albumTracks);
      }
    });

    document.getElementById("play-button").addEventListener("click", togglePlayback);
    document.getElementById("previous-button").addEventListener("click", () => {
      if (state.currentTime > 3) { state.currentTime = 0; state.startedAt = Date.now(); updatePlayer(); startSynth(); }
      else playAdjacent(-1);
    });
    document.getElementById("next-button").addEventListener("click", () => playAdjacent(1));
    document.getElementById("shuffle-button").addEventListener("click", event => {
      state.shuffled = !state.shuffled;
      event.currentTarget.classList.toggle("is-active", state.shuffled);
      event.currentTarget.setAttribute("aria-pressed", String(state.shuffled));
      showToast(state.shuffled ? "Mezcla activada" : "Mezcla desactivada");
    });
    document.getElementById("repeat-button").addEventListener("click", () => {
      state.repeating = !state.repeating;
      els.repeatButton.classList.toggle("is-active", state.repeating);
      els.repeatButton.setAttribute("aria-pressed", String(state.repeating));
      showToast(state.repeating ? "Repetir canción activado" : "Repetir canción desactivado");
    });
    document.getElementById("shuffle-all").addEventListener("click", () => {
      const list = getActiveTracks();
      if (list.length) {
        const randomTrack = list[Math.floor(Math.random() * list.length)];
        state.shuffled = true;
        els.shuffleButton.classList.add("is-active");
        playTrack(randomTrack.id);
      } else showToast("No hay canciones en esta lista todavía.");
    });
    document.getElementById("featured-play").addEventListener("click", () => playTrack("cielo-lento"));
    document.getElementById("see-all").addEventListener("click", () => setView("explore"));
    document.getElementById("new-playlist").addEventListener("click", () => {
      els.dialog.showModal();
      els.playlistName.focus();
    });
    document.getElementById("create-playlist").addEventListener("click", event => {
      event.preventDefault();
      createPlaylist(els.playlistName.value);
    });
    document.getElementById("confirm-add-track").addEventListener("click", event => {
      event.preventDefault();
      const playlist = allPlaylists().find(item => item.name === els.playlistSelect.value);
      if (!trackToAdd || !playlist) return;
      if (!playlist.tracks.includes(trackToAdd)) {
        playlist.tracks.push(trackToAdd);
        if (defaultPlaylists.some(item => item.name === playlist.name)) {
          state.playlistTracks[playlist.name] = playlist.tracks;
        }
        saveState();
        render();
        showToast(`Añadida a «${playlist.name}»`);
      } else {
        showToast("Esta canción ya está en la lista.");
      }
      els.addDialog.close();
      trackToAdd = null;
    });
    document.getElementById("like-current").addEventListener("click", () => {
      if (state.currentId) toggleFavorite(state.currentId);
    });
    els.search.addEventListener("input", () => {
      const list = getActiveTracks();
      renderAlbums(list);
      renderTracks(list);
      setQueue(list);
      if (els.search.value.trim()) els.pageTitle.textContent = "Resultados para tu búsqueda";
    });
    els.seekBar.addEventListener("input", () => {
      const track = getTrack(state.currentId);
      if (!track) return;
      state.currentTime = track.seconds * Number(els.seekBar.value) / 100;
      state.startedAt = Date.now();
      updatePlayer();
    });
    els.volume.addEventListener("input", () => {
      state.volume = Number(els.volume.value) / 100;
    });
    document.getElementById("back-button").addEventListener("click", () => {
      if (!state.previousViews.length) return;
      state.forwardViews.push({ view: state.view, playlist: state.playlist });
      const previous = state.previousViews.pop();
      setView(previous.view, previous.playlist, false);
    });
    document.getElementById("forward-button").addEventListener("click", () => {
      if (!state.forwardViews.length) return;
      state.previousViews.push({ view: state.view, playlist: state.playlist });
      const next = state.forwardViews.pop();
      setView(next.view, next.playlist, false);
    });
    document.addEventListener("keydown", event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        els.search.focus();
      }
      if (event.code === "Space" && !["INPUT", "BUTTON"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        togglePlayback();
      }
    });
  }

  function greetingTitle() {
    const hour = new Date().getHours();
    return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  }

  function initInstallPrompt() {
    const button = document.getElementById("install-button");
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      state.promptEvent = event;
      button.hidden = false;
    });
    button.addEventListener("click", async () => {
      if (!state.promptEvent) return;
      state.promptEvent.prompt();
      await state.promptEvent.userChoice;
      state.promptEvent = null;
      button.hidden = true;
    });
    window.addEventListener("appinstalled", () => {
      button.hidden = true;
      showToast("Sonora quedó instalada en este dispositivo.");
    });
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(error => {
        console.error("No se pudo activar el modo sin conexión:", error);
      });
    }
  }

  render();
  bindEvents();
  initInstallPrompt();
  window.setInterval(updateClock, 250);
})();
