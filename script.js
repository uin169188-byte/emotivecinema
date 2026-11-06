
const API_KEY = 'a322fcf944ad104411340fb57c52dd4f';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const STORAGE_KEY = 'emotiveCinema_watchlist';

// Mood -> TMDB genre id
const MOOD_GENRES = {
    happy: 35,       // Comedy
    thriller: 53,    // Thriller
    melancholy: 18,  // Drama
    romantic: 10749, // Romance
    scifi: 878       // Science Fiction
};

// Movies on screen, so buttons can find them by id
const shownMovies = {};

// ---------- 1. Watchlist (LocalStorage) ----------
function getWatchlist() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveWatchlist(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    document.getElementById('watchlist-count').textContent = list.length;
}

// ---------- 2. Small helpers ----------
function showToast(text) {
    const toast = document.getElementById('toast');
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toast.classList.remove('show'), 2000);
}

function safe(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function simplify(movie) {
    const desc = movie.overview || 'No description available.';
    return {
        id: movie.id,
        title: movie.title || movie.name,
        poster: movie.poster_path ? IMAGE_URL + movie.poster_path : '',
        rating: movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A',
        year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
        desc: desc.length > 120 ? desc.substring(0, 120) + '...' : desc
    };
}

// ---------- 3. Card HTML ----------
function cardHTML(movie, onWatchlistPage) {
    const saved = getWatchlist().some(m => m.id === movie.id);
    const poster = movie.poster
        ? `<img src="${movie.poster}" alt="${safe(movie.title)}" loading="lazy">`
        : `<div class="no-poster">No Poster</div>`;

    const secondButton = onWatchlistPage
        ? `<button class="btn-remove-watchlist" data-action="toggle" data-id="${movie.id}">
               <i class="fa-solid fa-trash"></i> Remove
           </button>`
        : `<button class="btn-add-watchlist ${saved ? 'saved' : ''}" data-action="toggle" data-id="${movie.id}">
               <span class="label-add"><i class="fa-solid fa-plus"></i> Add to Watchlist</span>
               <span class="label-saved"><i class="fa-solid fa-check"></i> Added</span>
           </button>`;

    return `
        <article class="movie-card">
            <div class="poster-box">
                ${poster}
                <span class="badge">&#9733; ${movie.rating}</span>
            </div>
            <div class="movie-info">
                <h3>${safe(movie.title)}</h3>
                <p class="meta">${movie.year}</p>
                <p class="desc">${safe(movie.desc)}</p>
                <div class="buttons-group">
                    <button class="btn-trailer" data-action="trailer" data-id="${movie.id}">
                        <i class="fa-solid fa-play"></i> Trailer
                    </button>
                    ${secondButton}
                </div>
            </div>
        </article>`;
}

// ---------- 4. Fetch movies ----------
async function loadMovies(endpoint = '/movie/popular', params = '') {
    const grid = document.getElementById('movies-container');
    grid.innerHTML = '<div class="skeleton"></div>'.repeat(8);

    try {
        const res = await fetch(`${BASE_URL}${endpoint}?api_key=${API_KEY}&language=en-US${params}`);
        const data = await res.json();

        if (!data.results || data.results.length === 0) {
            grid.innerHTML = '<p class="grid-message">No movies found.</p>';
            return;
        }

        const movies = data.results.map(simplify);
        movies.forEach(m => shownMovies[m.id] = m);
        grid.innerHTML = movies.map(m => cardHTML(m, false)).join('');
    } catch (error) {
        console.error(error);
        grid.innerHTML = '<p class="grid-message error">Network error occurred!</p>';
    }
}

function loadByMood(mood) {
    if (mood === 'all') loadMovies('/movie/popular');
    else loadMovies('/discover/movie', `&with_genres=${MOOD_GENRES[mood]}&sort_by=popularity.desc`);
}

// ---------- 5. Watchlist page ----------
function renderWatchlist() {
    const grid = document.getElementById('watchlist-container');
    const list = getWatchlist();
    // When the grid is empty, CSS shows the empty message by itself
    grid.innerHTML = list.map(m => cardHTML(m, true)).join('');
}

function toggleWatchlist(id) {
    const list = getWatchlist();
    const index = list.findIndex(m => m.id === id);

    if (index === -1) {
        if (!shownMovies[id]) return;
        list.push(shownMovies[id]);
        showToast('Added to your watchlist');
    } else {
        list.splice(index, 1);
        showToast('Removed from your watchlist');
    }
    saveWatchlist(list);

    // Only switch a class; CSS changes the color and the text
    document.querySelectorAll(`.btn-add-watchlist[data-id="${id}"]`)
        .forEach(btn => btn.classList.toggle('saved', index === -1));

    if (document.getElementById('watchlist-container')) renderWatchlist();
}

// ---------- 6. Trailer ----------
async function openTrailer(id) {
    try {
        const res = await fetch(`${BASE_URL}/movie/${id}/videos?api_key=${API_KEY}&language=en-US`);
        const data = await res.json();
        const videos = data.results || [];
        const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube')
            || videos.find(v => v.site === 'YouTube');

        if (!trailer) {
            showToast('Sorry, no trailer for this movie');
            return;
        }
        document.getElementById('trailer-iframe').src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
        document.getElementById('trailer-modal').classList.add('open');
    } catch (error) {
        console.error(error);
        showToast('Error loading trailer');
    }
}

function closeTrailer() {
    document.getElementById('trailer-modal').classList.remove('open');
    document.getElementById('trailer-iframe').src = '';
}

// ---------- 7. Day / Night mode ----------
// JS only flips one attribute; all colors come from CSS variables
function toggleTheme() {
    const root = document.documentElement;
    const isLight = root.getAttribute('data-theme') === 'light';
    if (isLight) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', 'light');
    try { localStorage.setItem('emotiveCinema_theme', isLight ? 'dark' : 'light'); } catch (e) { }
}

// ---------- 8. Start ----------
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    saveWatchlist(getWatchlist()); // updates the counter

    // Watchlist page
    if (document.getElementById('watchlist-container')) {
        renderWatchlist();
        document.getElementById('clear-all-btn').addEventListener('click', () => {
            saveWatchlist([]);
            renderWatchlist();
            showToast('Watchlist cleared');
        });
    }

    // Home / Movies pages
    if (document.getElementById('movies-container')) {
        loadMovies();
    }

    // Mood cards (Home)
    const moodBtns = document.querySelectorAll('.mood-btn');
    moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            moodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadByMood(btn.dataset.mood);
            document.getElementById('movies-container').scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Search (Movies) - waits until typing stops
    const search = document.getElementById('search-input');
    if (search) {
        let timer;
        search.addEventListener('input', () => {
            clearTimeout(timer);
            const q = search.value.trim();
            timer = setTimeout(() => {
                if (q) loadMovies('/search/movie', `&query=${encodeURIComponent(q)}`);
                else loadMovies();
            }, 500);
        });
    }

    // Mood select (Movies)
    const filter = document.getElementById('mood-filter');
    if (filter) filter.addEventListener('change', () => loadByMood(filter.value));

    // One listener for every card button
    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = Number(btn.dataset.id);
        if (btn.dataset.action === 'trailer') openTrailer(id);
        if (btn.dataset.action === 'toggle') toggleWatchlist(id);
    });

    // Close the trailer: X button, click outside, or Esc
    document.getElementById('close-modal').addEventListener('click', closeTrailer);
    document.getElementById('trailer-modal').addEventListener('click', e => {
        if (e.target.id === 'trailer-modal') closeTrailer();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeTrailer();
    });
});
